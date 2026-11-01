import "server-only";
import type { CustomerRequest, KotStatus, Prisma } from "@prisma/client";
import { db } from "./db";
import { upiLink } from "./billText";

export type RoundStatus = "PENDING" | "REJECTED" | KotStatus;

export type Round = {
  id: string;
  status: RoundStatus;
  rejectReason: string;
  at: string;
  items: { name: string; qty: number; isVeg: boolean }[];
};

export type CustomerStatus = {
  /** 0 Sent · 1 Accepted · 2 Cooking · 3 Ready · 4 Served/Collected · 5 Bill · 6 Paid; -1 = nothing accepted (all rejected) */
  stage: number;
  takeaway: boolean;
  tokenNo: number | null;
  rounds: Round[];
  running: number;
  billTotal: number | null;
  due: number | null;
  upi: string | null;
  closed: boolean;
};

const KOT_STAGE: Record<KotStatus, number> = { NEW: 1, PREPARING: 2, READY: 3, SERVED: 4 };

type OrderWithKots = Prisma.OrderGetPayload<{
  include: { kots: { include: { items: true } }; payments: true; outlet: true };
}>;

export const orderInclude = {
  kots: { orderBy: { createdAt: "asc" }, include: { items: true } },
  payments: true,
  outlet: true,
} satisfies Prisma.OrderInclude;

/** What the customer sees: each round (kitchen ticket, or request still waiting / not accepted) and the overall stage. */
export async function customerStatus(
  order: OrderWithKots | null,
  requests: CustomerRequest[],
  takeaway: boolean,
): Promise<CustomerStatus> {
  // Names for dishes in requests that are not kitchen tickets yet.
  const ids = requests.flatMap((r) => ((r.items ?? []) as { menuItemId: string }[]).map((l) => l.menuItemId));
  const menu = new Map((await db.menuItem.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, isVeg: true } })).map((m) => [m.id, m]));

  const rounds: Round[] = [];
  for (const k of order?.kots ?? []) {
    const items = k.items.filter((i) => !i.cancelled).map((i) => ({ name: i.name, qty: i.qty, isVeg: i.isVeg }));
    if (items.length) rounds.push({ id: k.id, status: k.status, rejectReason: "", at: k.createdAt.toISOString(), items });
  }
  for (const r of requests) {
    if (r.kind !== "ORDER" || r.status === "DONE") continue;
    rounds.push({
      id: r.id,
      status: r.status === "PENDING" ? "PENDING" : "REJECTED",
      rejectReason: r.rejectReason,
      at: r.createdAt.toISOString(),
      items: ((r.items ?? []) as { menuItemId: string; qty: number }[]).map((l) => ({
        name: menu.get(l.menuItemId)?.name ?? "Dish",
        isVeg: menu.get(l.menuItemId)?.isVeg ?? true,
        qty: l.qty,
      })),
    });
  }
  rounds.sort((a, b) => a.at.localeCompare(b.at));

  let stage = rounds.some((r) => r.status === "PENDING") ? 0 : -1;
  if (order) {
    const active = order.kots.filter((k) => k.status !== "SERVED" && k.items.some((i) => !i.cancelled));
    if (order.status === "PAID") stage = 6;
    else if (order.status === "BILLED") stage = 5;
    else if (active.length) stage = Math.min(...active.map((k) => KOT_STAGE[k.status]));
    else if (order.kots.length) stage = 4;
    else stage = 0;
  }

  const running = (order?.kots ?? []).flatMap((k) => k.items).filter((i) => !i.cancelled).reduce((s, i) => s + i.price * i.qty, 0);
  const billed = order?.status === "BILLED" || order?.status === "PAID";
  const paid = order?.payments.reduce((s, p) => s + p.amount, 0) ?? 0;
  const due = billed && order ? Math.max(0, order.total - paid) : null;

  return {
    stage,
    takeaway,
    tokenNo: order?.tokenNo ?? null,
    rounds,
    running,
    billTotal: billed && order ? order.total : null,
    due,
    upi:
      order && order.status === "BILLED" && order.outlet.upiId && due
        ? upiLink(order.outlet.upiId, order.outlet.name, due, `Bill ${order.billNo}`)
        : null,
    closed: order?.status === "PAID" || order?.status === "CANCELLED" || (!order && stage === -1),
  };
}
