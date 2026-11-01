import "server-only";
import { db } from "./db";

export type PendingRequest = {
  id: string;
  kind: "CALL_WAITER" | "BILL" | "ORDER";
  /** null for website takeaway orders */
  tableId: string | null;
  tableName: string | null;
  createdAt: string;
  /** the running order this request belongs to (table order, or website order already accepted) */
  orderId: string | null;
  tokenNo: number | null;
  customer: { name: string; phone: string; pickupTime: string } | null;
  items: { name: string; qty: number; note: string; isVeg: boolean }[];
};

/** Open customer requests (table QR and website), oldest first. */
export async function pendingRequests(outletId: string): Promise<PendingRequest[]> {
  const requests = await db.customerRequest.findMany({
    where: { outletId, status: "PENDING" },
    include: { table: { include: { orders: { where: { status: { in: ["OPEN", "BILLED"] } }, select: { id: true, tokenNo: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  const tokens = requests.map((r) => r.trackToken).filter((t): t is string => !!t);
  const online = new Map(
    (await db.order.findMany({ where: { trackToken: { in: tokens } }, select: { id: true, tokenNo: true, trackToken: true, status: true } }))
      .filter((o) => o.status === "OPEN" || o.status === "BILLED")
      .map((o) => [o.trackToken!, o]),
  );
  const ids = requests.flatMap((r) => ((r.items ?? []) as { menuItemId: string }[]).map((l) => l.menuItemId));
  const menu = new Map((await db.menuItem.findMany({ where: { id: { in: ids } } })).map((m) => [m.id, m]));

  return requests.map((r) => {
    const order = r.table ? r.table.orders[0] : r.trackToken ? online.get(r.trackToken) : undefined;
    return {
      id: r.id,
      kind: r.kind,
      tableId: r.tableId,
      tableName: r.table?.name ?? null,
      createdAt: r.createdAt.toISOString(),
      orderId: order?.id ?? null,
      tokenNo: order?.tokenNo ?? null,
      customer: r.tableId ? null : { name: r.customerName, phone: r.customerPhone, pickupTime: r.pickupTime },
      items: ((r.items ?? []) as { menuItemId: string; qty: number; note: string }[]).map((l) => ({
        name: menu.get(l.menuItemId)?.name ?? "Dish",
        isVeg: menu.get(l.menuItemId)?.isVeg ?? true,
        qty: l.qty,
        note: l.note,
      })),
    };
  });
}
