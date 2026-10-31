import Link from "next/link";
import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import { rupees } from "@/lib/money";
import { indiaDay, timeText } from "@/lib/time";
import { orderTitle } from "@/lib/orderTitle";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ day?: string; all?: string }> }) {
  const me = await requireStaff(CAN_MANAGE);
  const sp = await searchParams;
  const day = sp.day && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) ? sp.day : indiaDay();
  const allOutlets = me.role === "OWNER" && sp.all === "1";
  const from = new Date(`${day}T00:00:00+05:30`);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  const outletFilter = allOutlets ? {} : { outletId: me.outletId };

  const [paidOrders, payments, soldItems, removedItems, cancelledOrders, running, outlets] = await Promise.all([
    db.order.findMany({ where: { ...outletFilter, status: "PAID", paidAt: { gte: from, lt: to } }, select: { total: true, discount: true, outletId: true } }),
    db.payment.groupBy({ by: ["mode"], where: { order: outletFilter, createdAt: { gte: from, lt: to } }, _sum: { amount: true } }),
    db.orderItem.groupBy({
      by: ["name"],
      where: { cancelled: false, order: { ...outletFilter, status: "PAID", paidAt: { gte: from, lt: to } } },
      _sum: { qty: true },
      orderBy: { _sum: { qty: "desc" } },
      take: 10,
    }),
    db.orderItem.findMany({
      where: { cancelled: true, order: outletFilter, createdAt: { gte: from, lt: to } },
      include: { order: { include: { table: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.order.findMany({ where: { ...outletFilter, status: "CANCELLED", createdAt: { gte: from, lt: to } }, include: { table: true } }),
    db.order.findMany({ where: { ...outletFilter, status: { in: ["OPEN", "BILLED"] } }, include: { items: { where: { cancelled: false } } } }),
    db.outlet.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const sales = paidOrders.reduce((s, o) => s + o.total, 0);
  const discounts = paidOrders.reduce((s, o) => s + o.discount, 0);
  const avg = paidOrders.length ? Math.round(sales / paidOrders.length) : 0;
  const runningValue = running.reduce((s, o) => s + o.items.reduce((a, i) => a + i.price * i.qty, 0), 0);
  const byMode = Object.fromEntries(payments.map((p) => [p.mode, p._sum.amount ?? 0]));

  const prev = indiaDay(new Date(from.getTime() - 12 * 3600 * 1000));
  const next = indiaDay(new Date(to.getTime() + 12 * 3600 * 1000));
  const isToday = day === indiaDay();
  const q = (d: string) => `/reports?day=${d}${allOutlets ? "&all=1" : ""}`;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href={q(prev)} className="btn-outline min-h-9 px-3" aria-label="Previous day">
          ←
        </Link>
        <div className="text-center">
          <div className="font-bold">{isToday ? "Today" : new Date(from).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" })}</div>
          {me.role === "OWNER" && (
            <Link href={`/reports?day=${day}${allOutlets ? "" : "&all=1"}`} className="text-xs text-muted underline">
              {allOutlets ? "Showing both outlets · show this outlet only" : "This outlet only · show both outlets"}
            </Link>
          )}
        </div>
        {isToday ? (
          <span className="w-11" />
        ) : (
          <Link href={q(next)} className="btn-outline min-h-9 px-3" aria-label="Next day">
            →
          </Link>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat label="Sales" value={rupees(sales)} big />
        <Stat label="Bills" value={String(paidOrders.length)} />
        <Stat label="Average bill" value={rupees(avg)} />
        <Stat label="Discounts given" value={rupees(discounts)} />
      </div>

      {allOutlets && (
        <Section title="By outlet">
          {outlets.map((o) => (
            <Row key={o.id} label={o.name} value={rupees(paidOrders.filter((p) => p.outletId === o.id).reduce((s, p) => s + p.total, 0))} />
          ))}
        </Section>
      )}

      <Section title="Payments received">
        <Row label="💵 Cash" value={rupees(byMode.CASH ?? 0)} />
        <Row label="📱 UPI" value={rupees(byMode.UPI ?? 0)} />
        <Row label="💳 Card" value={rupees(byMode.CARD ?? 0)} />
      </Section>

      {isToday && running.length > 0 && (
        <Section title="Still running">
          <Row label={`${running.length} open order${running.length > 1 ? "s" : ""} (not paid yet)`} value={rupees(runningValue)} />
        </Section>
      )}

      <Section title="Top dishes">
        {soldItems.length === 0 ? (
          <p className="p-3 text-sm text-muted">No sales yet.</p>
        ) : (
          soldItems.map((i) => <Row key={i.name} label={i.name} value={`${i._sum.qty ?? 0} sold`} />)
        )}
      </Section>

      <Section title={`Removed items (${removedItems.length})`}>
        {removedItems.length === 0 ? (
          <p className="p-3 text-sm text-muted">None. 👍</p>
        ) : (
          removedItems.map((i) => (
            <div key={i.id} className="p-3 text-sm">
              <div className="flex justify-between font-medium">
                <span>
                  {i.qty} × {i.name}
                </span>
                <span>{rupees(i.price * i.qty)}</span>
              </div>
              <div className="text-muted">
                {orderTitle(i.order)} · {timeText(i.createdAt)} · {i.cancelReason}
              </div>
            </div>
          ))
        )}
      </Section>

      {cancelledOrders.length > 0 && (
        <Section title={`Cancelled orders (${cancelledOrders.length})`}>
          {cancelledOrders.map((o) => (
            <div key={o.id} className="p-3 text-sm">
              <div className="font-medium">{orderTitle(o)}</div>
              <div className="text-muted">
                {timeText(o.createdAt)} · {o.cancelReason}
              </div>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className={`card p-3 ${big ? "bg-ink text-white" : ""}`}>
      <div className={`text-xs ${big ? "text-gold" : "text-muted"}`}>{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{title}</h2>
      <div className="card divide-y divide-line">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between p-3 text-sm">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
