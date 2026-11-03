import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import Link from "next/link";
import { resetTableQr, saveTable, setTableActive } from "@/app/actions/manage";
import SubmitButton from "@/components/SubmitButton";

export default async function TablesAdminPage({ searchParams }: { searchParams: Promise<{ error?: string; reset?: string }> }) {
  const me = await requireStaff(CAN_MANAGE);
  const { error, reset } = await searchParams;
  const outlet = await db.outlet.findUniqueOrThrow({ where: { id: me.outletId } });
  if (outlet.type === "COUNTER") {
    return <p className="card p-4 text-sm text-muted">{outlet.name} is a counter outlet, so it has no tables.</p>;
  }
  const tables = await db.diningTable.findMany({ where: { outletId: me.outletId }, orderBy: [{ active: "desc" }, { sortOrder: "asc" }] });

  return (
    <div>
      <div className="card mb-4 flex items-center justify-between gap-3 p-3">
        <p className="text-sm text-muted">Each table has its own QR. Customers scan it to see the menu, order, call the waiter and pay.</p>
        <Link href="/print/qr" className="btn-gold shrink-0 text-sm">
          Print QR codes
        </Link>
      </div>
      <div className="card mb-4 divide-y divide-line">
        {tables.map((t) => (
          <div key={t.id} className={`p-3 ${t.active ? "" : "opacity-50"}`}>
            <form action={saveTable} className="flex items-center gap-2">
              <input type="hidden" name="id" value={t.id} />
              <input name="name" defaultValue={t.name} className="input w-20" aria-label="Table name" />
              <input name="seats" defaultValue={t.seats} inputMode="numeric" className="input w-16" aria-label="Seats" />
              <span className="text-sm text-muted">seats</span>
              <SubmitButton className="btn-outline ml-auto min-h-9 px-3 text-sm">Save</SubmitButton>
            </form>
            <div className="mt-2 flex gap-4 text-sm text-muted">
              <Link href={`/t/${t.qrToken}`} className="underline" target="_blank">
                Customer view
              </Link>
              <form action={resetTableQr}>
                <input type="hidden" name="id" value={t.id} />
                <SubmitButton className="underline">New QR</SubmitButton>
              </form>
              <form action={setTableActive} className="ml-auto">
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="active" value={String(!t.active)} />
                <SubmitButton className="underline">{t.active ? "Hide table" : "Show table"}</SubmitButton>
              </form>
            </div>
          </div>
        ))}
      </div>
      <form action={saveTable} className="card flex items-center gap-2 p-3">
        <input name="name" placeholder={`T${tables.length + 1}`} className="input w-20" aria-label="New table name" />
        <input name="seats" defaultValue={4} inputMode="numeric" className="input w-16" aria-label="Seats" />
        <span className="text-sm text-muted">seats</span>
        <SubmitButton className="btn-primary ml-auto min-h-9 text-sm">+ Add table</SubmitButton>
      </form>
    </div>
  );
}
