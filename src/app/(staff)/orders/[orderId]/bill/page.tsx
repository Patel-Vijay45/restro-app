import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { CAN_ORDER, CAN_TAKE_PAYMENT, requireStaff } from "@/lib/auth";
import { calculateBill } from "@/lib/bill";
import { billText, upiLink } from "@/lib/billText";
import { rupees } from "@/lib/money";
import { orderTitle } from "@/lib/orderTitle";
import { timeText } from "@/lib/time";
import VegMark from "@/components/VegMark";
import BillPanel from "./BillPanel";

export default async function BillPage({ params }: { params: Promise<{ orderId: string }> }) {
  const me = await requireStaff(CAN_ORDER);
  const { orderId } = await params;
  const order = await db.order.findFirst({
    where: { id: orderId, outletId: me.outletId },
    include: { outlet: true, table: true, items: { where: { cancelled: false }, orderBy: { createdAt: "asc" } }, payments: { include: { receivedBy: { select: { name: true } } } } },
  });
  if (!order) notFound();

  // Same dish ordered in two rounds shows as one line on the bill.
  const grouped = new Map<string, { name: string; isVeg: boolean; price: number; qty: number }>();
  for (const i of order.items) {
    const key = `${i.menuItemId}:${i.price}`;
    const g = grouped.get(key);
    if (g) g.qty += i.qty;
    else grouped.set(key, { name: i.name, isVeg: i.isVeg, price: i.price, qty: i.qty });
  }
  const lines = [...grouped.values()];

  const totals =
    order.status === "OPEN"
      ? calculateBill(order.items, { kind: "none" }, { enabled: order.outlet.gstEnabled, rateBp: order.outlet.gstRateBp })
      : order;
  const paid = order.payments.reduce((s, p) => s + p.amount, 0);
  const due = Math.max(0, totals.total - paid);
  const title = orderTitle(order);

  const upi =
    order.status === "BILLED" && order.outlet.upiId && due > 0
      ? await QRCode.toDataURL(upiLink(order.outlet.upiId, order.outlet.name, due, `Bill ${order.billNo}`), { margin: 1, width: 360 })
      : null;

  const shareText = billText({
    outletName: order.outlet.name,
    billNo: order.billNo,
    title,
    date: order.billedAt ?? order.createdAt,
    items: lines,
    subtotal: totals.subtotal,
    discount: totals.discount,
    tax: totals.tax,
    roundOff: totals.roundOff,
    total: totals.total,
    footer: order.outlet.billFooter,
  });

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link href={order.type === "COUNTER" ? "/orders" : `/orders/${order.id}`} className="text-2xl" aria-label="Back">
          ←
        </Link>
        <div>
          <h1 className="text-xl font-bold">{order.billNo ? `Bill #${order.billNo}` : "Bill preview"}</h1>
          <p className="text-sm text-muted">{title}</p>
        </div>
      </div>

      <div className="card mb-4 p-4">
        <ul className="space-y-2">
          {lines.map((l, i) => (
            <li key={i} className="flex items-center gap-2">
              <VegMark veg={l.isVeg} />
              <span className="flex-1">
                {l.qty} × {l.name}
              </span>
              <span className="font-medium">{rupees(l.price * l.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-dashed border-line pt-3 text-sm">
          <Row label="Subtotal" value={rupees(totals.subtotal)} />
          {totals.discount > 0 && (
            <Row label={`Discount${order.discountNote ? ` (${order.discountNote})` : ""}`} value={`-${rupees(totals.discount)}`} />
          )}
          {totals.tax > 0 && <Row label={`GST (${order.outlet.gstRateBp / 100}%)`} value={rupees(totals.tax)} />}
          {totals.roundOff !== 0 && <Row label="Round off" value={rupees(totals.roundOff)} />}
        </div>
        <div className="mt-2 flex justify-between border-t border-line pt-2 text-lg font-bold">
          <span>Total</span>
          <span>{rupees(totals.total)}</span>
        </div>
        {order.payments.length > 0 && (
          <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
            {order.payments.map((p) => (
              <Row key={p.id} label={`Paid by ${p.mode} · ${timeText(p.createdAt)} · ${p.receivedBy.name}`} value={rupees(p.amount)} />
            ))}
            {order.status !== "PAID" && <Row label="Balance due" value={rupees(due)} bold />}
          </div>
        )}
      </div>

      <BillPanel
        orderId={order.id}
        status={order.status}
        isCounter={order.type === "COUNTER"}
        canDiscount={CAN_TAKE_PAYMENT.includes(me.role)}
        canTakePayment={CAN_TAKE_PAYMENT.includes(me.role)}
        hasPayments={order.payments.length > 0}
        due={due}
        upiQr={upi}
        customerPhone={order.customerPhone}
        shareText={shareText}
      />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : "text-muted"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
