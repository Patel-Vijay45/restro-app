import Link from "next/link";
import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import { rupees } from "@/lib/money";
import { costOf, formatQty } from "@/lib/units";

export default async function StockPage() {
  const me = await requireStaff(CAN_MANAGE);
  const ingredients = await db.ingredient.findMany({ where: { outletId: me.outletId, active: true }, orderBy: { name: "asc" } });
  const low = ingredients.filter((i) => i.stock <= i.lowStock);
  const ok = ingredients.filter((i) => i.stock > i.lowStock);
  const value = ingredients.reduce((s, i) => s + costOf(Math.max(0, i.stock), i.costPerUnit), 0);

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold">Stock</h1>
          <p className="text-sm text-muted">
            {ingredients.length} ingredients · worth about {rupees(value)}
          </p>
        </div>
        <Link href="/stock/new" className="btn-outline min-h-9 text-sm">
          + Ingredient
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2">
        <Link href="/stock/purchase" className="card flex flex-col items-center gap-1 p-3 text-sm font-semibold">
          <span className="text-2xl">🛒</span>Purchase
        </Link>
        <Link href="/stock/wastage" className="card flex flex-col items-center gap-1 p-3 text-sm font-semibold">
          <span className="text-2xl">🗑️</span>Wastage
        </Link>
        <Link href="/stock/count" className="card flex flex-col items-center gap-1 p-3 text-sm font-semibold">
          <span className="text-2xl">📋</span>Count
        </Link>
      </div>

      {ingredients.length === 0 && (
        <p className="card p-4 text-sm text-muted">
          No ingredients yet. Add the raw materials you buy (chicken, rice, oil…), then set a recipe for each dish in Manage →
          Menu so stock goes down automatically with every order.
        </p>
      )}

      {low.length > 0 && (
        <Section title={`Running low (${low.length})`} danger>
          {low.map((i) => (
            <Row key={i.id} id={i.id} name={i.name} stock={formatQty(i.stock, i.unit)} hint={`alert at ${formatQty(i.lowStock, i.unit)}`} danger />
          ))}
        </Section>
      )}
      {ok.length > 0 && (
        <Section title="In stock">
          {ok.map((i) => (
            <Row key={i.id} id={i.id} name={i.name} stock={formatQty(i.stock, i.unit)} hint={`alert at ${formatQty(i.lowStock, i.unit)}`} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, danger, children }: { title: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className={`mb-2 text-sm font-bold uppercase tracking-wide ${danger ? "text-nonveg" : "text-muted"}`}>{title}</h2>
      <div className={`card divide-y divide-line ${danger ? "border-nonveg/40" : ""}`}>{children}</div>
    </section>
  );
}

function Row({ id, name, stock, hint, danger }: { id: string; name: string; stock: string; hint: string; danger?: boolean }) {
  return (
    <Link href={`/stock/${id}`} className="flex items-center justify-between p-3">
      <span>
        <span className="font-medium">{name}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <span className={`font-bold ${danger ? "text-nonveg" : ""}`}>{stock}</span>
    </Link>
  );
}
