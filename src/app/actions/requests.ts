"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { CAN_ORDER, requireStaff } from "@/lib/auth";
import { createKot, tableOrderId, UserError, type CartLine } from "@/lib/orderOps";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Waiter confirms a customer's order from the table QR: it goes to the kitchen like any other order. */
export async function approveOrderRequest(requestId: string): Promise<Result<{ orderId: string }>> {
  const me = await requireStaff(CAN_ORDER);
  try {
    const orderId = await db.$transaction(async (tx) => {
      const request = await tx.tableRequest.findFirst({ where: { id: requestId, outletId: me.outletId, kind: "ORDER" } });
      if (!request) throw new UserError("Request not found");
      // Only one waiter can take it, even if two tap at the same moment.
      const claimed = await tx.tableRequest.updateMany({
        where: { id: request.id, status: "PENDING" },
        data: { status: "DONE", handledById: me.staffId, handledAt: new Date() },
      });
      if (claimed.count === 0) throw new UserError("Someone already handled this");
      const orderId = await tableOrderId(tx, me, request.tableId);
      await createKot(tx, me, orderId, (request.items ?? []) as CartLine[]);
      return orderId;
    });
    revalidatePath("/", "layout");
    return { ok: true, orderId };
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    throw e;
  }
}

/** Mark a call/bill request as handled, or reject an order request. */
export async function closeRequest(requestId: string, status: "DONE" | "REJECTED"): Promise<Result> {
  const me = await requireStaff(CAN_ORDER);
  await db.tableRequest.updateMany({
    where: { id: requestId, outletId: me.outletId, status: "PENDING" },
    data: { status, handledById: me.staffId, handledAt: new Date() },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
