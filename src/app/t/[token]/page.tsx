import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getMenu } from "@/lib/menu";
import { upiLink } from "@/lib/billText";
import AutoRefresh from "@/components/AutoRefresh";
import CustomerView, { type CustomerOrder } from "./CustomerView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "DFC Family Restaurant: Menu", robots: { index: false } };

/** Customer page behind each table's QR code. Public: no login. */
export default async function TablePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const table = await db.diningTable.findUnique({ where: { qrToken: token }, include: { outlet: true } });

  if (!table || !table.active) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center p-6 text-center">
        <div className="mb-3 text-4xl">🙏</div>
        <h1 className="text-lg font-bold">This QR code is not active</h1>
        <p className="text-muted">Please ask your waiter for help.</p>
      </main>
    );
  }

  const [menu, order, pending] = await Promise.all([
    getMenu(table.outletId),
    db.order.findFirst({
      where: { tableId: table.id, status: { in: ["OPEN", "BILLED"] } },
      include: { kots: { orderBy: { createdAt: "asc" }, include: { items: { where: { cancelled: false } } } }, payments: true },
    }),
    db.tableRequest.findMany({ where: { tableId: table.id, status: "PENDING" }, orderBy: { createdAt: "asc" } }),
  ]);

  // Names for dishes in order requests that the waiter hasn't confirmed yet.
  const names = new Map(menu.flatMap((c) => c.items).map((i) => [i.id, i]));
  const waiting = pending
    .filter((r) => r.kind === "ORDER")
    .flatMap((r) => ((r.items ?? []) as { menuItemId: string; qty: number }[]).map((l) => ({ ...l, name: names.get(l.menuItemId)?.name ?? "Dish" })));

  let customerOrder: CustomerOrder | null = null;
  if (order) {
    const items = order.kots.flatMap((k) => k.items.map((i) => ({ id: i.id, name: i.name, qty: i.qty, isVeg: i.isVeg, price: i.price, status: k.status })));
    const paid = order.payments.reduce((s, p) => s + p.amount, 0);
    const billed = order.status === "BILLED";
    customerOrder = {
      items,
      running: items.reduce((s, i) => s + i.price * i.qty, 0),
      billTotal: billed ? order.total : null,
      due: billed ? order.total - paid : null,
      upi: billed && table.outlet.upiId && order.total - paid > 0 ? upiLink(table.outlet.upiId, table.outlet.name, order.total - paid, `Bill ${order.billNo}`) : null,
    };
  }

  return (
    <>
      <AutoRefresh seconds={5} />
      <CustomerView
        token={token}
        outletName={table.outlet.name}
        tableName={table.name}
        phone={table.outlet.phone}
        menu={menu}
        order={customerOrder}
        waiting={waiting}
        calling={pending.some((r) => r.kind === "CALL_WAITER")}
        billAsked={pending.some((r) => r.kind === "BILL")}
      />
    </>
  );
}
