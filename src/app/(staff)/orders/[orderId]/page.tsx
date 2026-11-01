import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CAN_MANAGE, CAN_ORDER, requireStaff } from "@/lib/auth";
import { rupees } from "@/lib/money";
import { timeText } from "@/lib/time";
import { orderTitle } from "@/lib/orderTitle";
import AutoRefresh from "@/components/AutoRefresh";
import VegMark from "@/components/VegMark";
import { CancelItemButton, CancelOrderButton, ServeButton } from "./OrderControls";

const KOT_LABEL = { NEW: "Waiting", PREPARING: "Cooking", READY: "Ready to serve", SERVED: "Served" } as const;
const KOT_STYLE = {
  NEW: "bg-line text-ink",
  PREPARING: "bg-busy text-ink",
  READY: "bg-veg text-white",
  SERVED: "bg-free text-veg",
} as const;

export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const me = await requireStaff(CAN_ORDER);
  const { orderId } = await params;
  const order = await db.order.findFirst({
    where: { id: orderId, outletId: me.outletId },
    include: {
      table: true,
      createdBy: { select: { name: true } },
      kots: { orderBy: { createdAt: "asc" }, include: { items: { orderBy: { createdAt: "asc" } } } },
      payments: true,
    },
  });
  if (!order) notFound();

  const closed = order.status === "PAID" || order.status === "CANCELLED";
  const canManage = CAN_MANAGE.includes(me.role);
  const liveItems = order.kots.flatMap((k) => k.items).filter((i) => !i.cancelled);
  const running = liveItems.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div>
      {!closed && <AutoRefresh />}
      <div className="mb-4 flex items-start gap-3">
        <Link href="/orders" className="text-2xl" aria-label="Back">
          ←
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{orderTitle(order)}</h1>
          <p className="text-sm text-muted">
            Opened {timeText(order.createdAt)} by {order.createdBy.name}
            {order.guests ? ` · ${order.guests} guests` : ""}
          </p>
          {order.customerPhone && (
            <p className="text-sm">
              {order.channel === "ONLINE" && "🌐 Online · "}
              <a href={`tel:+91${order.customerPhone}`} className="underline">
                {order.customerPhone}
              </a>
              {order.pickupTime && ` · pickup ${order.pickupTime}`}
            </p>
          )}
        </div>
        <StatusChip status={order.status} />
      </div>

      {order.status === "CANCELLED" && (
        <p className="card mb-4 border-nonveg/30 p-3 text-sm text-nonveg">Cancelled: {order.cancelReason}</p>
      )}

      <div className="space-y-3">
        {order.kots.map((kot) => (
          <div key={kot.id} className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line bg-paper px-3 py-2 text-sm">
              <span className="font-semibold">
                KOT #{kot.number} · {timeText(kot.createdAt)}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${KOT_STYLE[kot.status]}`}>
                {KOT_LABEL[kot.status]}
              </span>
            </div>
            <ul className="divide-y divide-line">
              {kot.items.map((item) => (
                <li key={item.id} className="flex items-start gap-2 px-3 py-2.5">
                  <span className="pt-1">
                    <VegMark veg={item.isVeg} />
                  </span>
                  <div className={`flex-1 ${item.cancelled ? "text-muted line-through" : ""}`}>
                    <span className="font-medium">
                      {item.qty} × {item.name}
                    </span>
                    {item.note && <div className="text-sm text-muted no-underline">“{item.note}”</div>}
                    {item.cancelled && <div className="text-xs text-nonveg">Removed: {item.cancelReason}</div>}
                  </div>
                  <span className={`text-sm font-semibold ${item.cancelled ? "text-muted line-through" : ""}`}>
                    {rupees(item.price * item.qty)}
                  </span>
                  {canManage && !closed && !item.cancelled && <CancelItemButton itemId={item.id} name={item.name} />}
                </li>
              ))}
            </ul>
            {kot.status === "READY" && !closed && (
              <div className="border-t border-line p-2">
                <ServeButton kotId={kot.id} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card mt-4 flex items-center justify-between p-4">
        <span className="text-muted">{order.status === "OPEN" ? "Running total" : "Bill total"}</span>
        <span className="text-xl font-bold">{rupees(order.status === "OPEN" ? running : order.total)}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {!closed && (
          <Link href={`/orders/${order.id}/add`} className="btn-outline">
            + Add items
          </Link>
        )}
        {!closed && liveItems.length > 0 && (
          <Link href={`/orders/${order.id}/bill`} className="btn-primary">
            {order.status === "BILLED" ? "Payment →" : "Bill →"}
          </Link>
        )}
        {order.status === "PAID" && (
          <>
            <Link href={`/orders/${order.id}/bill`} className="btn-outline">
              View bill
            </Link>
            <Link href={`/print/${order.id}`} className="btn-primary">
              Print
            </Link>
          </>
        )}
      </div>
      {canManage && !closed && order.payments.length === 0 && (
        <div className="mt-6 text-center">
          <CancelOrderButton orderId={order.id} />
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: "bg-busy",
    BILLED: "bg-billed text-nonveg",
    PAID: "bg-free text-veg",
    CANCELLED: "bg-line text-muted",
  };
  const label: Record<string, string> = { OPEN: "Running", BILLED: "Bill given", PAID: "Paid", CANCELLED: "Cancelled" };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${map[status]}`}>{label[status]}</span>;
}
