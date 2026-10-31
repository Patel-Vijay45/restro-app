import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import { saveTable, setTableActive } from "@/app/actions/manage";
import Notice from "@/components/Notice";

export default async function TablesAdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await requireStaff(CAN_MANAGE);
  const { error } = await searchParams;
  const outlet = await db.outlet.findUniqueOrThrow({ where: { id: me.outletId } });
  if (outlet.type === "COUNTER") {
    return <p className="card p-4 text-sm text-muted">{outlet.name} is a counter outlet, so it has no tables.</p>;
  }
  const tables = await db.diningTable.findMany({ where: { outletId: me.outletId }, orderBy: [{ active: "desc" }, { sortOrder: "asc" }] });

  return (
    <div>
      <Notice error={error} />
      <div className="card mb-4 divide-y divide-line">
        {tables.map((t) => (
          <div key={t.id} className={`flex items-center gap-2 p-3 ${t.active ? "" : "opacity-50"}`}>
            <form action={saveTable} className="flex flex-1 items-center gap-2">
              <input type="hidden" name="id" value={t.id} />
              <input name="name" defaultValue={t.name} className="input w-20" aria-label="Table name" />
              <input name="seats" defaultValue={t.seats} inputMode="numeric" className="input w-16" aria-label="Seats" />
              <span className="text-sm text-muted">seats</span>
              <button className="btn-outline min-h-9 px-3 text-sm">Save</button>
            </form>
            <form action={setTableActive}>
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="active" value={String(!t.active)} />
              <button className="text-sm text-muted underline">{t.active ? "Hide" : "Show"}</button>
            </form>
          </div>
        ))}
      </div>
      <form action={saveTable} className="card flex items-center gap-2 p-3">
        <input name="name" placeholder={`T${tables.length + 1}`} className="input w-20" aria-label="New table name" />
        <input name="seats" defaultValue={4} inputMode="numeric" className="input w-16" aria-label="Seats" />
        <span className="text-sm text-muted">seats</span>
        <button className="btn-primary ml-auto min-h-9 text-sm">+ Add table</button>
      </form>
      <p className="mt-3 text-sm text-muted">Table QR codes for customers come in the next phase.</p>
    </div>
  );
}
