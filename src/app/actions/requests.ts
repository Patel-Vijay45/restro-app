"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { CAN_ORDER, requireStaff, type Me } from "@/lib/auth";
import { nextNumber } from "@/lib/counters";
import { createKot, tableOrderId, UserError, type CartLine } from "@/lib/orderOps";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
type Tx = Prisma.TransactionClient;

/** The order a website request belongs to: the customer's running order, or a new takeaway order with a token. */
async function onlineOrderId(
  tx: Tx,
  me: Me,
  request: { trackToken: string | null; customerName: string; customerPhone: string; pickupTime: string },
): Promise<string> {
  if (!request.trackToken) throw new UserError("Request has no table and no order");
  // Two staff accepting two rounds of the same order at once must not open two orders.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${request.trackToken}))`;
  const existing = await tx.order.findUnique({ where: { trackToken: request.trackToken } });
  if (existing) {
    if (existing.status === "PAID" || existing.status === "CANCELLED") {
      throw new UserError("This customer's order is already closed. Reject this and ask them to order again.");
    }
    if (existing.status === "BILLED") await tx.order.update({ where: { id: existing.id }, data: { status: "OPEN" } });
    return existing.id;
  }
  const tokenNo = await nextNumber(tx, me.outletId, "token");
  const order = await tx.order.create({
    data: {
      outletId: me.outletId,
      type: "TAKEAWAY",
      channel: "ONLINE",
      tokenNo,
      trackToken: request.trackToken,
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      pickupTime: request.pickupTime,
      createdById: me.staffId,
    },
  });
  return order.id;
}

/** Staff accept a customer's order (table QR or website): it goes to the kitchen like any other order. */
export async function approveOrderRequest(requestId: string): Promise<Result<{ orderId: string }>> {
  const me = await requireStaff(CAN_ORDER);
  try {
    const orderId = await db.$transaction(async (tx) => {
      const request = await tx.customerRequest.findFirst({ where: { id: requestId, outletId: me.outletId, kind: "ORDER" } });
      if (!request) throw new UserError("Request not found");
      // Only one person can take it, even if two tap at the same moment.
      const claimed = await tx.customerRequest.updateMany({
        where: { id: request.id, status: "PENDING" },
        data: { status: "DONE", handledById: me.staffId, handledAt: new Date() },
      });
      if (claimed.count === 0) throw new UserError("Someone already handled this");
      const orderId = request.tableId ? await tableOrderId(tx, me, request.tableId) : await onlineOrderId(tx, me, request);
      const kot = await createKot(tx, me, orderId, (request.items ?? []) as CartLine[]);
      await tx.customerRequest.update({ where: { id: request.id }, data: { orderId, kotId: kot.id } });
      return orderId;
    });
    revalidatePath("/", "layout");
    return { ok: true, orderId };
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    throw e;
  }
}

/** Mark a call/bill request as handled, or reject an order request (the reason is shown to the customer). */
export async function closeRequest(requestId: string, status: "DONE" | "REJECTED", reason = ""): Promise<Result> {
  const me = await requireStaff(CAN_ORDER);
  await db.customerRequest.updateMany({
    where: { id: requestId, outletId: me.outletId, status: "PENDING" },
    data: { status, rejectReason: reason.trim().slice(0, 120), handledById: me.staffId, handledAt: new Date() },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
