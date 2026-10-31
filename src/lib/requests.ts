import "server-only";
import { db } from "./db";

export type PendingRequest = {
  id: string;
  kind: "CALL_WAITER" | "BILL" | "ORDER";
  tableId: string;
  tableName: string;
  createdAt: string;
  orderId: string | null;
  items: { name: string; qty: number; note: string; isVeg: boolean }[];
};

/** Open customer requests from table QR codes, oldest first. */
export async function pendingRequests(outletId: string): Promise<PendingRequest[]> {
  const requests = await db.tableRequest.findMany({
    where: { outletId, status: "PENDING" },
    include: { table: { include: { orders: { where: { status: { in: ["OPEN", "BILLED"] } }, select: { id: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  const ids = requests.flatMap((r) => ((r.items ?? []) as { menuItemId: string }[]).map((l) => l.menuItemId));
  const menu = new Map((await db.menuItem.findMany({ where: { id: { in: ids } } })).map((m) => [m.id, m]));
  return requests.map((r) => ({
    id: r.id,
    kind: r.kind,
    tableId: r.tableId,
    tableName: r.table.name,
    createdAt: r.createdAt.toISOString(),
    orderId: r.table.orders[0]?.id ?? null,
    items: ((r.items ?? []) as { menuItemId: string; qty: number; note: string }[]).map((l) => ({
      name: menu.get(l.menuItemId)?.name ?? "Dish",
      isVeg: menu.get(l.menuItemId)?.isVeg ?? true,
      qty: l.qty,
      note: l.note,
    })),
  }));
}
