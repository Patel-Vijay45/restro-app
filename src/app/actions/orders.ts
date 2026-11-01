"use server";

import { revalidatePath } from "next/cache";
import type { KotStatus, OrderType, PaymentMode, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { CAN_MANAGE, CAN_ORDER, CAN_SEE_KITCHEN, CAN_TAKE_PAYMENT, requireStaff, type Me } from "@/lib/auth";
import { nextNumber } from "@/lib/counters";
import { createKot, UserError, tableOrderId, type CartLine } from "@/lib/orderOps";
import { calculateBill, type Discount } from "@/lib/bill";
import { returnForItems } from "@/lib/stock";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
type Tx = Prisma.TransactionClient;

export type { CartLine };

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function refresh() {
  revalidatePath("/", "layout");
}

async function run<T extends object>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const value = await fn();
    refresh();
    return { ok: true, ...value };
  } catch (e) {
    if (e instanceof UserError) return fail(e.message);
    throw e;
  }
}

/**
 * Send items to the kitchen.
 * - existing order: adds a new kitchen ticket to it (a billed order goes back to open)
 * - table: opens a new order for the table, or adds to the one already running there
 * - takeaway: new order with a token number
 */
export async function sendToKitchen(input: {
  orderId?: string;
  tableId?: string;
  type?: Extract<OrderType, "DINE_IN" | "TAKEAWAY">;
  guests?: number;
  customerName?: string;
  cart: CartLine[];
}): Promise<Result<{ orderId: string }>> {
  const me = await requireStaff(CAN_ORDER);
  return run(() =>
    db.$transaction(async (tx) => {
      let orderId = input.orderId;

      if (orderId) {
        const order = await tx.order.findFirst({ where: { id: orderId, outletId: me.outletId } });
        if (!order) throw new UserError("Order not found");
        if (order.status === "PAID" || order.status === "CANCELLED") throw new UserError("This order is closed");
        if (order.status === "BILLED") await tx.order.update({ where: { id: order.id }, data: { status: "OPEN" } });
      } else if (input.tableId) {
        orderId = await tableOrderId(tx, me, input.tableId, input.guests);
      } else {
        const tokenNo = await nextNumber(tx, me.outletId, "token");
        const order = await tx.order.create({
          data: {
            outletId: me.outletId,
            type: "TAKEAWAY",
            tokenNo,
            customerName: (input.customerName ?? "").trim().slice(0, 60),
            createdById: me.staffId,
          },
        });
        orderId = order.id;
      }

      await createKot(tx, me, orderId, input.cart);
      return { orderId };
    }),
  );
}

/** Counter (stall): order, kitchen ticket and bill in one step. Payment is taken next. */
export async function counterCheckout(cart: CartLine[]): Promise<Result<{ orderId: string }>> {
  const me = await requireStaff(CAN_TAKE_PAYMENT);
  return run(() =>
    db.$transaction(async (tx) => {
      const tokenNo = await nextNumber(tx, me.outletId, "token");
      const order = await tx.order.create({
        data: { outletId: me.outletId, type: "COUNTER", tokenNo, createdById: me.staffId },
      });
      await createKot(tx, me, order.id, cart);
      await billOrder(tx, me, order.id, { kind: "none" });
      return { orderId: order.id };
    }),
  );
}

export async function setKotStatus(kotId: string, status: KotStatus): Promise<Result> {
  const me = await requireStaff([...CAN_SEE_KITCHEN, ...CAN_ORDER]);
  return run(async () => {
    const kot = await db.kot.findFirst({ where: { id: kotId, outletId: me.outletId }, include: { outlet: true } });
    if (!kot) throw new UserError("Ticket not found");
    // In the restaurant, waiters may only mark food as served; cooking states belong to the kitchen.
    // At the stall the counter person does everything.
    if (status !== "SERVED" && !CAN_SEE_KITCHEN.includes(me.role) && kot.outlet.type !== "COUNTER") {
      throw new UserError("Only the kitchen can change this");
    }
    await db.kot.update({ where: { id: kot.id }, data: { status } });
    return {};
  });
}

/** Remove an item that was already sent to the kitchen. Managers only, and a reason is kept for the report. */
export async function cancelItem(itemId: string, reason: string): Promise<Result> {
  const me = await requireStaff(CAN_MANAGE);
  return run(async () => {
    if (!reason.trim()) throw new UserError("Give a reason");
    const item = await db.orderItem.findFirst({
      where: { id: itemId, order: { outletId: me.outletId } },
      include: { order: true, kot: true },
    });
    if (!item) throw new UserError("Item not found");
    if (item.order.status === "PAID" || item.order.status === "CANCELLED") throw new UserError("This order is closed");
    await db.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: item.id },
        data: { cancelled: true, cancelReason: `${reason.trim().slice(0, 120)} (by ${me.name})` },
      });
      // Not cooked yet: the ingredients are still in stock. Already cooking: they count as used.
      if (item.kot.status === "NEW") await returnForItems(tx, me.staffId, [item.id]);
      // A billed order's totals are now wrong, so it must be billed again.
      if (item.order.status === "BILLED") await tx.order.update({ where: { id: item.orderId }, data: { status: "OPEN" } });
    });
    return {};
  });
}

export async function cancelOrder(orderId: string, reason: string): Promise<Result> {
  const me = await requireStaff(CAN_MANAGE);
  return run(async () => {
    if (!reason.trim()) throw new UserError("Give a reason");
    const order = await db.order.findFirst({
      where: { id: orderId, outletId: me.outletId },
      include: { payments: true },
    });
    if (!order) throw new UserError("Order not found");
    if (order.status === "PAID" || order.status === "CANCELLED") throw new UserError("This order is closed");
    if (order.payments.length > 0) throw new UserError("A payment was already taken for this order");
    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", cancelReason: `${reason.trim().slice(0, 120)} (by ${me.name})` },
      });
      const notCooked = await tx.orderItem.findMany({
        where: { orderId: order.id, cancelled: false, kot: { status: "NEW" } },
        select: { id: true },
      });
      await returnForItems(tx, me.staffId, notCooked.map((i) => i.id));
    });
    return {};
  });
}

async function billOrder(tx: Tx, me: Me, orderId: string, discount: Discount) {
  const order = await tx.order.findFirst({
    where: { id: orderId, outletId: me.outletId },
    include: { items: true, outlet: true, payments: true },
  });
  if (!order) throw new UserError("Order not found");
  if (order.status === "PAID" || order.status === "CANCELLED") throw new UserError("This order is closed");
  if (!order.items.some((i) => !i.cancelled)) throw new UserError("No items to bill");

  const totals = calculateBill(order.items, discount, {
    enabled: order.outlet.gstEnabled,
    rateBp: order.outlet.gstRateBp,
  });
  const paid = order.payments.reduce((s, p) => s + p.amount, 0);
  const billNo = order.billNo ?? (await nextNumber(tx, me.outletId, "bill"));
  const settled = paid >= totals.total;

  // The customer's "ask for bill" from the table QR is answered now.
  if (order.tableId) {
    await tx.customerRequest.updateMany({
      where: { tableId: order.tableId, kind: "BILL", status: "PENDING" },
      data: { status: "DONE", handledById: me.staffId, handledAt: new Date() },
    });
  }

  await tx.order.update({
    where: { id: order.id },
    data: {
      ...totals,
      discountNote: discount.kind === "percent" ? `${discount.percent}%` : "",
      billNo,
      status: settled ? "PAID" : "BILLED",
      billedAt: new Date(),
      paidAt: settled ? new Date() : null,
    },
  });
}

export async function generateBill(orderId: string, discount: Discount): Promise<Result> {
  const me = await requireStaff(CAN_ORDER);
  if (discount.kind !== "none" && !CAN_TAKE_PAYMENT.includes(me.role)) {
    return fail("Only the cashier, manager or owner can give a discount");
  }
  if (discount.kind === "percent" && !(discount.percent > 0 && discount.percent <= 100)) {
    return fail("Discount must be between 1% and 100%");
  }
  if (discount.kind === "flat" && !(Number.isInteger(discount.paise) && discount.paise > 0)) {
    return fail("Enter a valid discount amount");
  }
  return run(() => db.$transaction((tx) => billOrder(tx, me, orderId, discount).then(() => ({}))));
}

/** Record a payment. When the total is covered the order is closed and the table becomes free. */
export async function addPayment(orderId: string, mode: PaymentMode, amount: number): Promise<Result<{ change: number }>> {
  const me = await requireStaff(CAN_TAKE_PAYMENT);
  if (!Number.isInteger(amount) || amount <= 0) return fail("Enter a valid amount");
  return run(() =>
    db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${orderId}))`;
      const order = await tx.order.findFirst({
        where: { id: orderId, outletId: me.outletId },
        include: { payments: true },
      });
      if (!order) throw new UserError("Order not found");
      if (order.status !== "BILLED") throw new UserError("Generate the bill first");
      const paid = order.payments.reduce((s, p) => s + p.amount, 0);
      const due = order.total - paid;
      if (amount > due && mode !== "CASH") throw new UserError("Amount is more than the balance due");
      const take = Math.min(amount, due);
      await tx.payment.create({ data: { orderId, mode, amount: take, receivedById: me.staffId } });
      if (paid + take >= order.total) {
        await tx.order.update({ where: { id: orderId }, data: { status: "PAID", paidAt: new Date() } });
      }
      return { change: amount - take };
    }),
  );
}

export async function setCustomer(orderId: string, name: string, phone: string): Promise<Result> {
  const me = await requireStaff(CAN_ORDER);
  return run(async () => {
    const digits = phone.replace(/\D/g, "").slice(-10);
    if (phone.trim() && digits.length !== 10) throw new UserError("Enter a 10-digit mobile number");
    const updated = await db.order.updateMany({
      where: { id: orderId, outletId: me.outletId },
      data: { customerName: name.trim().slice(0, 60), customerPhone: digits },
    });
    if (updated.count === 0) throw new UserError("Order not found");
    return {};
  });
}
