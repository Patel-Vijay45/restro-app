import Link from "next/link";
import { db } from "@/lib/db";
import { CAN_ORDER, requireStaff } from "@/lib/auth";
import { getMenu } from "@/lib/menu";
import { rupees } from "@/lib/money";
import { minutesSince } from "@/lib/time";
import AutoRefresh from "@/components/AutoRefresh";
import MenuPicker from "@/components/MenuPicker";
import TokenBoard from "./TokenBoard";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const me = await requireStaff(CAN_ORDER);
  const outlet = await db.outlet.findUniqueOrThrow({ where: { id: me.outletId } });
  const { view } = await searchParams;

  const active = await db.order.findMany({
    where: { outletId: me.outletId, status: { in: ["OPEN", "BILLED"] } },
    include: { items: { where: { cancelled: false } }, kots: { select: { status: true } }, table: true },
    orderBy: { createdAt: "asc" },
  });
  const running = (o: (typeof active)[number]) =>
    o.status === "BILLED" ? o.total : o.items.reduce((s, i) => s + i.price * i.qty, 0);

  if (outlet.type === "COUNTER") {
    // Counter orders stay on the token board until the food is collected, even after payment.
    const tokens = await db.order.findMany({
      where: {
        outletId: me.outletId,
        type: "COUNTER",
        status: { in: ["BILLED", "PAID"] },
        kots: { some: { status: { not: "SERVED" } } },
      },
      include: { items: { where: { cancelled: false } }, kots: true },
      orderBy: { createdAt: "asc" },
    });
    const showTokens = view === "tokens";
    return (
      <div>
        <AutoRefresh seconds={showTokens ? 4 : 15} />
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-line/60 p-1 text-sm font-semibold">
          <Link href="/orders" className={`rounded-lg py-2 text-center ${!showTokens ? "bg-white shadow-sm" : "text-muted"}`}>
            New order
          </Link>
          <Link
            href="/orders?view=tokens"
            className={`rounded-lg py-2 text-center ${showTokens ? "bg-white shadow-sm" : "text-muted"}`}
          >
            Tokens ({tokens.length})
          </Link>
        </div>
        {showTokens ? (
          <TokenBoard
            tokens={tokens.map((o) => ({
              orderId: o.id,
              tokenNo: o.tokenNo ?? 0,
              paid: o.status === "PAID",
              total: o.total,
              items: o.items.map((i) => `${i.qty} × ${i.name}`),
              kots: o.kots.filter((k) => k.status !== "SERVED").map((k) => ({ id: k.id, status: k.status })),
            }))}
          />
        ) : (
          <MenuPicker menu={await getMenu(me.outletId)} target={{ kind: "counter" }} />
        )}
      </div>
    );
  }

  const tables = await db.diningTable.findMany({
    where: { outletId: me.outletId, active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const byTable = new Map(active.filter((o) => o.tableId).map((o) => [o.tableId!, o]));
  const takeaways = active.filter((o) => o.type === "TAKEAWAY");
  const busy = byTable.size;

  return (
    <div>
      <AutoRefresh />
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold">Tables</h1>
          <p className="text-sm text-muted">
            {busy} of {tables.length} occupied
          </p>
        </div>
        <div className="flex gap-3 text-xs text-muted">
          <Legend className="bg-free" label="Free" />
          <Legend className="bg-busy" label="Eating" />
          <Legend className="bg-billed" label="Bill" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {tables.map((t) => {
          const order = byTable.get(t.id);
          const ready = order?.kots.some((k) => k.status === "READY");
          const href = order ? `/orders/${order.id}` : `/orders/new?table=${t.id}`;
          const bg = !order ? "bg-free" : order.status === "BILLED" ? "bg-billed" : "bg-busy";
          return (
            <Link key={t.id} href={href} className={`relative flex aspect-square flex-col justify-between rounded-2xl border border-line p-3 ${bg}`}>
              <span className="text-2xl font-bold">{t.name}</span>
              {order ? (
                <span className="text-sm">
                  <span className="block font-semibold">{rupees(running(order))}</span>
                  <span className="text-muted">
                    {order.status === "BILLED" ? "Bill given" : `${minutesSince(order.createdAt)} min`}
                  </span>
                </span>
              ) : (
                <span className="text-sm text-muted">{t.seats} seats</span>
              )}
              {ready && (
                <span className="absolute right-2 top-2 rounded-full bg-veg px-2 py-0.5 text-[11px] font-bold text-white">
                  READY
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="mb-2 mt-6 flex items-center justify-between">
        <h2 className="text-lg font-bold">Takeaway</h2>
        <Link href="/orders/new?type=takeaway" className="btn-outline min-h-9 text-sm">
          + New takeaway
        </Link>
      </div>
      {takeaways.length === 0 ? (
        <p className="text-sm text-muted">No takeaway orders running.</p>
      ) : (
        <div className="card divide-y divide-line">
          {takeaways.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between p-3">
              <span>
                <span className="font-semibold">Token {o.tokenNo}</span>
                {o.customerName && <span className="text-muted"> · {o.customerName}</span>}
                {o.kots.some((k) => k.status === "READY") && (
                  <span className="ml-2 rounded-full bg-veg px-2 py-0.5 text-[11px] font-bold text-white">READY</span>
                )}
              </span>
              <span className="font-semibold">{rupees(running(o))}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`size-3 rounded border border-line ${className}`} />
      {label}
    </span>
  );
}
