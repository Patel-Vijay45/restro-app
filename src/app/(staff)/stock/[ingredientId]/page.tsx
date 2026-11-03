import { notFound } from "next/navigation";
import type { StockMoveType } from "@prisma/client";
import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import { saveIngredient, setIngredientActive } from "@/app/actions/stock";
import { rupees } from "@/lib/money";
import { dateTimeText } from "@/lib/time";
import { UNIT_LABEL, formatQty, formatRecipeQty } from "@/lib/units";
import BackHeader from "@/components/BackHeader";
import SubmitButton from "@/components/SubmitButton";

const MOVE_LABEL: Record<StockMoveType, string> = {
  PURCHASE: "Bought",
  SALE: "Used in order",
  CANCEL_RETURN: "Returned (item removed)",
  WASTAGE: "Wasted",
  COUNT_ADJUST: "Count correction",
};

export default async function IngredientPage({
  params,
  searchParams,
}: {
  params: Promise<{ ingredientId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const me = await requireStaff(CAN_MANAGE);
  const { ingredientId } = await params;
  const sp = await searchParams;
  const isNew = ingredientId === "new";
  const ingredient = isNew
    ? null
    : await db.ingredient.findFirst({
        where: { id: ingredientId, outletId: me.outletId },
        include: {
          moves: { orderBy: { createdAt: "desc" }, take: 60, include: { staff: { select: { name: true } } } },
          recipeLines: { include: { menuItem: { select: { name: true, active: true } } } },
        },
      });
  if (!isNew && !ingredient) notFound();
  const big = (milli: number) => String(milli / 1000);

  return (
    <div>
      <BackHeader title={ingredient ? ingredient.name : "New ingredient"} href="/stock" />

      {ingredient && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className={`card p-3 ${ingredient.stock <= ingredient.lowStock ? "border-nonveg/40" : ""}`}>
            <div className="text-xs text-muted">In stock</div>
            <div className={`text-xl font-bold ${ingredient.stock <= ingredient.lowStock ? "text-nonveg" : ""}`}>
              {formatQty(ingredient.stock, ingredient.unit)}
            </div>
          </div>
          <div className="card p-3">
            <div className="text-xs text-muted">Average cost</div>
            <div className="text-xl font-bold">
              {rupees(ingredient.costPerUnit)}
              <span className="text-sm font-normal text-muted"> / {UNIT_LABEL[ingredient.unit].big}</span>
            </div>
          </div>
        </div>
      )}

      <form action={saveIngredient} className="card mb-4 space-y-4 p-4">
        {ingredient && <input type="hidden" name="id" value={ingredient.id} />}
        <label className="block">
          <span className="label">Name</span>
          <input name="name" required defaultValue={ingredient?.name} className="input" placeholder="e.g. Chicken" />
        </label>
        <label className="block">
          <span className="label">Unit</span>
          <select name="unit" defaultValue={ingredient?.unit ?? "KG"} className="input">
            <option value="KG">kg (recipes in grams)</option>
            <option value="LITRE">litre (recipes in ml)</option>
            <option value="PIECE">pieces</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Warn me when stock is at or below (kg / L / pcs)</span>
          <input name="lowStock" inputMode="decimal" defaultValue={ingredient ? big(ingredient.lowStock) : ""} className="input" placeholder="e.g. 2" />
        </label>
        {isNew && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Stock now</span>
              <input name="opening" inputMode="decimal" className="input" placeholder="e.g. 5" />
            </label>
            <label className="block">
              <span className="label">Price per kg / L / pc (₹)</span>
              <input name="cost" inputMode="decimal" className="input" placeholder="e.g. 240" />
            </label>
          </div>
        )}
        <SubmitButton className="btn-primary w-full">Save</SubmitButton>
      </form>

      {ingredient && (
        <>
          <section className="mb-4">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Used in dishes</h2>
            <div className="card divide-y divide-line">
              {ingredient.recipeLines.filter((r) => r.menuItem.active).length === 0 ? (
                <p className="p-3 text-sm text-muted">Not in any recipe yet. Add it in Manage → Menu → dish → Recipe.</p>
              ) : (
                ingredient.recipeLines
                  .filter((r) => r.menuItem.active)
                  .map((r) => (
                    <div key={r.id} className="flex justify-between p-3 text-sm">
                      <span>{r.menuItem.name}</span>
                      <span className="text-muted">{formatRecipeQty(r.qty, ingredient.unit)} each</span>
                    </div>
                  ))
              )}
            </div>
          </section>

          <section className="mb-4">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">History</h2>
            <div className="card divide-y divide-line">
              {ingredient.moves.length === 0 && <p className="p-3 text-sm text-muted">No stock changes yet.</p>}
              {ingredient.moves.map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-3 p-3 text-sm">
                  <span>
                    <span className="font-medium">{MOVE_LABEL[m.type]}</span>
                    {(m.supplier || m.note) && <span className="text-muted"> · {[m.supplier, m.note].filter(Boolean).join(" · ")}</span>}
                    <span className="block text-xs text-muted">
                      {dateTimeText(m.createdAt)}
                      {m.staff ? ` · ${m.staff.name}` : ""}
                      {m.type === "PURCHASE" ? ` · paid ${rupees(m.value)}` : ""}
                    </span>
                  </span>
                  <span className={`shrink-0 font-semibold ${m.qty < 0 ? "text-nonveg" : "text-veg"}`}>
                    {m.qty > 0 ? "+" : ""}
                    {formatQty(m.qty, ingredient.unit)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <form action={setIngredientActive} className="text-center">
            <input type="hidden" name="id" value={ingredient.id} />
            <input type="hidden" name="active" value={String(!ingredient.active)} />
            <SubmitButton className="text-sm font-medium text-nonveg underline">
              {ingredient.active ? "Stop tracking this ingredient" : "Track again"}
            </SubmitButton>
          </form>
        </>
      )}
    </div>
  );
}
