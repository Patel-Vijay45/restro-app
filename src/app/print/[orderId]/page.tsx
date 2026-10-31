import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { CAN_ORDER, requireStaff } from "@/lib/auth";
import { upiLink } from "@/lib/billText";
import { rupees } from "@/lib/money";
import { orderTitle } from "@/lib/orderTitle";
import { dateTimeText } from "@/lib/time";
import PrintControls from "./PrintControls";

export const dynamic = "force-dynamic";

/** Receipt sized for a thermal printer (58 or 80 mm paper, set per outlet). */
export default async function PrintPage({ params }: { params: Promise<{ orderId: string }> }) {
  const me = await requireStaff(CAN_ORDER);
  const { orderId } = await params;
  const order = await db.order.findFirst({
    where: { id: orderId, outletId: me.outletId },
    include: { outlet: true, table: true, items: { where: { cancelled: false }, orderBy: { createdAt: "asc" } }, payments: true },
  });
  if (!order || !order.billNo) notFound();

  const grouped = new Map<string, { name: string; price: number; qty: number }>();
  for (const i of order.items) {
    const key = `${i.menuItemId}:${i.price}`;
    const g = grouped.get(key);
    if (g) g.qty += i.qty;
    else grouped.set(key, { name: i.name, price: i.price, qty: i.qty });
  }
  const o = order.outlet;
  const paid = order.payments.reduce((s, p) => s + p.amount, 0);
  const due = order.total - paid;
  const upiQr =
    o.upiId && due > 0 ? await QRCode.toDataURL(upiLink(o.upiId, o.name, due, `Bill ${order.billNo}`), { margin: 0, width: 240 }) : null;
  const width = o.paperWidth === 58 ? "48mm" : "72mm";

  return (
    <div className="min-h-dvh bg-white p-4 print:p-0">
      <style>{`@page { size: ${o.paperWidth}mm auto; margin: 2mm; } body { background: white; }`}</style>
      <PrintControls backHref={`/orders/${order.id}/bill`} />
      <div style={{ width }} className="mx-auto font-mono text-[11px] leading-snug text-black">
        <div className="text-center">
          <div className="text-[14px] font-bold">{o.name}</div>
          {o.address && <div>{o.address}</div>}
          {o.phone && <div>Ph: {o.phone}</div>}
          {o.gstEnabled && o.gstin && <div>GSTIN: {o.gstin}</div>}
        </div>
        <Dash />
        <div className="flex justify-between">
          <span>Bill #{order.billNo}</span>
          <span>{orderTitle(order)}</span>
        </div>
        <div>{dateTimeText(order.billedAt ?? order.createdAt)}</div>
        <Dash />
        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th className="font-normal">Item</th>
              <th className="text-right font-normal">Qty</th>
              <th className="text-right font-normal">Amt</th>
            </tr>
          </thead>
          <tbody>
            {[...grouped.values()].map((l, i) => (
              <tr key={i} className="align-top">
                <td className="pr-1">{l.name}</td>
                <td className="text-right">{l.qty}</td>
                <td className="pl-1 text-right">{(l.price * l.qty / 100).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Dash />
        <Line label="Subtotal" value={rupees(order.subtotal)} />
        {order.discount > 0 && <Line label="Discount" value={`-${rupees(order.discount)}`} />}
        {order.tax > 0 && <Line label={`GST ${o.gstRateBp / 100}%`} value={rupees(order.tax)} />}
        {order.roundOff !== 0 && <Line label="Round off" value={rupees(order.roundOff)} />}
        <div className="flex justify-between text-[14px] font-bold">
          <span>TOTAL</span>
          <span>{rupees(order.total)}</span>
        </div>
        {order.payments.length > 0 && (
          <>
            <Dash />
            {order.payments.map((p) => (
              <Line key={p.id} label={`Paid (${p.mode})`} value={rupees(p.amount)} />
            ))}
          </>
        )}
        {upiQr && (
          <div className="mt-2 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={upiQr} alt="UPI QR" style={{ width: "32mm" }} />
            <div>Scan to pay by UPI</div>
          </div>
        )}
        <Dash />
        <div className="text-center">{o.billFooter}</div>
      </div>
    </div>
  );
}

function Dash() {
  return <div className="my-1 border-t border-dashed border-black" />;
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
