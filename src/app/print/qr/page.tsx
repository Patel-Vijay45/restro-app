import QRCode from "qrcode";
import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import { baseUrl } from "@/lib/baseUrl";
import PrintControls from "../[orderId]/PrintControls";

export const dynamic = "force-dynamic";

/** A4 sheet of table QR cards (6 per page). Print, cut, and put in table stands or laminate. */
export default async function QrSheetPage() {
  const me = await requireStaff(CAN_MANAGE);
  const outlet = await db.outlet.findUniqueOrThrow({ where: { id: me.outletId } });
  const tables = await db.diningTable.findMany({ where: { outletId: me.outletId, active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const base = await baseUrl();
  const cards = await Promise.all(
    tables.map(async (t) => ({
      id: t.id,
      name: t.name,
      qr: await QRCode.toDataURL(`${base}/t/${t.qrToken}`, { margin: 1, width: 600, errorCorrectionLevel: "M" }),
    })),
  );

  return (
    <div className="min-h-dvh bg-white p-4 print:p-0">
      <style>{`@page { size: A4; margin: 10mm; } body { background: white; }`}</style>
      <PrintControls backHref="/manage/tables" />
      {cards.length === 0 && <p className="text-center text-muted">No tables. Add tables in Manage → Tables.</p>}
      <div className="mx-auto grid max-w-[190mm] grid-cols-2 gap-[6mm]">
        {cards.map((c) => (
          <div key={c.id} className="flex h-[85mm] break-inside-avoid flex-col items-center justify-between rounded-[5mm] border-[0.6mm] border-ink bg-white p-[5mm] text-ink">
            <div className="flex items-center gap-2">
              <span className="flex size-[11mm] items-center justify-center rounded-full bg-ink font-serif text-[9pt] font-bold text-gold">DFC</span>
              <span className="text-left leading-tight">
                <span className="block text-[11pt] font-bold">{outlet.name}</span>
                <span className="block text-[8pt] text-muted">Scan for menu · order · bill</span>
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.qr} alt={`QR for table ${c.name}`} className="size-[48mm]" />
            <div className="text-center">
              <div className="text-[20pt] font-black tracking-wide">TABLE {c.name.replace(/^T/i, "")}</div>
              <div className="text-[7.5pt] text-muted">🔔 Call waiter · 🧾 Ask for bill · 📱 Pay by UPI</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
