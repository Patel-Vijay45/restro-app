"use server";

// Actions for customers: the table QR page (identified by the table's secret QR code) and website takeaway orders
// (identified by the order's secret tracking code). No login.
// Nothing here reaches the kitchen directly: staff accept every order request first.

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { priceCart, UserError, type CartLine } from "@/lib/orderOps";
import { serverT } from "@/lib/lang";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const MAX_REQUESTS_PER_10_MIN = 10; // per table, or per phone number for website orders
const MAX_PENDING_ORDERS = 2; // order requests waiting for staff, per table / per website order
const MAX_ITEMS = 30;

async function run<T extends object>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const value = await fn();
    revalidatePath("/", "layout");
    return { ok: true, ...value };
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    throw e;
  }
}

async function checkedItems(outletId: string, cart: CartLine[]): Promise<Prisma.InputJsonValue> {
  const tr = await serverT();
  if (cart.reduce((s, l) => s + l.qty, 0) > MAX_ITEMS) throw new UserError(tr("err.bigOrder"));
  // Checks every dish is on this outlet's menu and not sold out.
  const lines = await db.$transaction((tx) => priceCart(tx, outletId, cart));
  return lines.map((l) => ({ menuItemId: l.menuItemId, qty: l.qty, note: l.note }));
}

// ---------- Table QR ----------

async function findTable(token: string) {
  const tr = await serverT();
  const table = await db.diningTable.findUnique({ where: { qrToken: token }, include: { outlet: true } });
  if (!table || !table.active) throw new UserError(tr("err.qrInvalid"));
  const recent = await db.customerRequest.count({
    where: { tableId: table.id, createdAt: { gte: new Date(Date.now() - 10 * 60000) } },
  });
  if (recent >= MAX_REQUESTS_PER_10_MIN) throw new UserError(tr("err.tooManyTable"));
  return table;
}

export async function customerCall(token: string, kind: "CALL_WAITER" | "BILL"): Promise<Result> {
  return run(async () => {
    const tr = await serverT();
    const table = await findTable(token);
    if (kind === "BILL") {
      const order = await db.order.findFirst({ where: { tableId: table.id, status: { in: ["OPEN", "BILLED"] } } });
      if (!order) throw new UserError(tr("err.noOrderYet"));
    }
    // Pressing the button twice should not ring twice.
    const already = await db.customerRequest.findFirst({ where: { tableId: table.id, kind, status: "PENDING" } });
    if (!already) await db.customerRequest.create({ data: { outletId: table.outletId, tableId: table.id, kind } });
    return {};
  });
}

/** Customer at a table sends dishes (first order or "add more"). A waiter confirms before the kitchen sees it. */
export async function customerOrder(token: string, cart: CartLine[]): Promise<Result> {
  return run(async () => {
    const tr = await serverT();
    const table = await findTable(token);
    const pending = await db.customerRequest.count({ where: { tableId: table.id, kind: "ORDER", status: "PENDING" } });
    if (pending >= MAX_PENDING_ORDERS) {
      throw new UserError(tr("err.waitingTable"));
    }
    const items = await checkedItems(table.outletId, cart);
    await db.customerRequest.create({ data: { outletId: table.outletId, tableId: table.id, kind: "ORDER", items } });
    return {};
  });
}

// ---------- Website takeaway ----------

function cleanPhone(phone: string, tr: Awaited<ReturnType<typeof serverT>>): string {
  const digits = phone.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  if (!/^[6-9]\d{9}$/.test(digits)) throw new UserError(tr("err.mobile"));
  return digits;
}

/** Website takeaway order. Payment happens at the counter when collecting. Returns the tracking code. */
export async function placeOnlineOrder(input: {
  outletId: string;
  cart: CartLine[];
  name: string;
  phone: string;
  pickupTime: string;
}): Promise<Result<{ trackToken: string }>> {
  return run(async () => {
    const tr = await serverT();
    const outlet = await db.outlet.findFirst({ where: { id: input.outletId, showOnWebsite: true } });
    if (!outlet) throw new UserError(tr("err.outletClosed"));
    const name = input.name.trim().slice(0, 60);
    if (!name) throw new UserError(tr("err.name"));
    const phone = cleanPhone(input.phone, tr);

    const recent = await db.customerRequest.count({
      where: { customerPhone: phone, createdAt: { gte: new Date(Date.now() - 10 * 60000) } },
    });
    if (recent >= MAX_REQUESTS_PER_10_MIN) throw new UserError(tr("err.tooManyNumber"));
    const waiting = await db.customerRequest.count({ where: { customerPhone: phone, kind: "ORDER", status: "PENDING" } });
    if (waiting >= MAX_PENDING_ORDERS) throw new UserError(tr("err.waitingOnline"));

    const items = await checkedItems(outlet.id, input.cart);
    const trackToken = randomBytes(12).toString("base64url");
    await db.customerRequest.create({
      data: {
        outletId: outlet.id,
        kind: "ORDER",
        items,
        trackToken,
        customerName: name,
        customerPhone: phone,
        pickupTime: input.pickupTime.trim().slice(0, 40),
      },
    });
    return { trackToken };
  });
}

/** "Add more" from the tracking page: another round for the same order and the same bill. */
export async function addToOnlineOrder(trackToken: string, cart: CartLine[]): Promise<Result> {
  return run(async () => {
    const tr = await serverT();
    const first = await db.customerRequest.findFirst({ where: { trackToken }, orderBy: { createdAt: "asc" } });
    if (!first) throw new UserError(tr("err.notFound"));
    const order = await db.order.findUnique({ where: { trackToken } });
    if (order && (order.status === "PAID" || order.status === "CANCELLED")) {
      throw new UserError(tr("err.closed"));
    }
    if (!order) {
      const open = await db.customerRequest.count({ where: { trackToken, status: "PENDING" } });
      if (open === 0) throw new UserError(tr("err.notAccepted"));
    }
    const pending = await db.customerRequest.count({ where: { trackToken, kind: "ORDER", status: "PENDING" } });
    if (pending >= MAX_PENDING_ORDERS) throw new UserError(tr("err.waitingItems"));
    const recent = await db.customerRequest.count({ where: { trackToken, createdAt: { gte: new Date(Date.now() - 10 * 60000) } } });
    if (recent >= MAX_REQUESTS_PER_10_MIN) throw new UserError(tr("err.tooMany"));

    const items = await checkedItems(first.outletId, cart);
    await db.customerRequest.create({
      data: {
        outletId: first.outletId,
        kind: "ORDER",
        items,
        trackToken,
        customerName: first.customerName,
        customerPhone: first.customerPhone,
        pickupTime: first.pickupTime,
      },
    });
    return {};
  });
}
