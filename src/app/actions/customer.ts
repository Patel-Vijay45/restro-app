"use server";

// Actions for customers on the table QR page. No login: the secret in the QR link identifies the table.
// Nothing here reaches the kitchen directly. A waiter confirms every order request first.

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { priceCart, UserError, type CartLine } from "@/lib/orderOps";

type Result = { ok: true } | { ok: false; error: string };

const MAX_REQUESTS_PER_10_MIN = 10;
const MAX_PENDING_ORDERS = 2;

async function findTable(token: string) {
  const table = await db.diningTable.findUnique({ where: { qrToken: token }, include: { outlet: true } });
  if (!table || !table.active) throw new UserError("This QR code is no longer valid. Please ask the waiter.");
  const recent = await db.tableRequest.count({
    where: { tableId: table.id, createdAt: { gte: new Date(Date.now() - 10 * 60000) } },
  });
  if (recent >= MAX_REQUESTS_PER_10_MIN) throw new UserError("Too many requests. The waiter will be with you shortly.");
  return table;
}

async function run(fn: () => Promise<void>): Promise<Result> {
  try {
    await fn();
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function customerCall(token: string, kind: "CALL_WAITER" | "BILL"): Promise<Result> {
  return run(async () => {
    const table = await findTable(token);
    if (kind === "BILL") {
      const order = await db.order.findFirst({ where: { tableId: table.id, status: { in: ["OPEN", "BILLED"] } } });
      if (!order) throw new UserError("There is no order on this table yet.");
    }
    // Pressing the button twice should not ring twice.
    const already = await db.tableRequest.findFirst({ where: { tableId: table.id, kind, status: "PENDING" } });
    if (already) return;
    await db.tableRequest.create({ data: { outletId: table.outletId, tableId: table.id, kind } });
  });
}

export async function customerOrder(token: string, cart: CartLine[]): Promise<Result> {
  return run(async () => {
    const table = await findTable(token);
    const pending = await db.tableRequest.count({ where: { tableId: table.id, kind: "ORDER", status: "PENDING" } });
    if (pending >= MAX_PENDING_ORDERS) {
      throw new UserError("Your earlier order is still waiting for the waiter. Please wait a moment.");
    }
    if (cart.reduce((s, l) => s + l.qty, 0) > 30) throw new UserError("For big orders please ask the waiter.");
    // Checks every dish is on this outlet's menu and not sold out.
    const lines = await db.$transaction((tx) => priceCart(tx, table.outletId, cart));
    const items: Prisma.InputJsonValue = lines.map((l) => ({ menuItemId: l.menuItemId, qty: l.qty, note: l.note }));
    await db.tableRequest.create({ data: { outletId: table.outletId, tableId: table.id, kind: "ORDER", items } });
  });
}
