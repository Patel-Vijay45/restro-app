import BackHeader from "@/components/BackHeader";
import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import { ingredientOptions } from "@/lib/ingredients";
import { recordPurchase } from "@/app/actions/stock";
import IngredientQty from "@/components/IngredientQty";
import Notice from "@/components/Notice";

export default async function PurchasePage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; supplier?: string }> }) {
  const me = await requireStaff(CAN_MANAGE);
  const sp = await searchParams;
  const [ingredients, suppliers] = await Promise.all([
    ingredientOptions(me.outletId),
    db.stockMove.findMany({
      where: { outletId: me.outletId, type: "PURCHASE", supplier: { not: "" } },
      distinct: ["supplier"],
      select: { supplier: true },
      take: 30,
    }),
  ]);

  return (
    <div>
      <BackHeader title="Purchase" href="/stock" />
      <Notice error={sp.error} success={sp.saved ? `Saved: ${sp.saved}. Add the next item below.` : undefined} />
      <form action={recordPurchase} className="card space-y-4 p-4">
        <IngredientQty ingredients={ingredients} qtyLabel="Quantity bought" />
        <label className="block">
          <span className="label">Total paid (₹)</span>
          <input name="amount" inputMode="decimal" required className="input" placeholder="e.g. 520" />
        </label>
        <label className="block">
          <span className="label">Supplier (optional)</span>
          <input name="supplier" list="suppliers" defaultValue={sp.supplier} className="input" placeholder="e.g. Ramesh Chicken Centre" />
          <datalist id="suppliers">
            {suppliers.map((s) => (
              <option key={s.supplier} value={s.supplier} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className="label">Note (optional)</span>
          <input name="note" className="input" placeholder="e.g. bill no. 233" />
        </label>
        <button className="btn-primary w-full">Save purchase</button>
      </form>
      <p className="mt-3 text-sm text-muted">The ingredient&apos;s cost is updated from what you paid, so dish costs stay correct.</p>
    </div>
  );
}
