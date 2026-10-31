import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import { ingredientOptions } from "@/lib/ingredients";
import { recordWastage } from "@/app/actions/stock";
import IngredientQty from "@/components/IngredientQty";
import Notice from "@/components/Notice";
import BackHeader from "@/components/BackHeader";

export default async function WastagePage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const me = await requireStaff(CAN_MANAGE);
  const sp = await searchParams;
  const ingredients = await ingredientOptions(me.outletId);
  return (
    <div>
      <BackHeader title="Wastage" href="/stock" />
      <Notice error={sp.error} success={sp.saved ? `Recorded: ${sp.saved} wasted.` : undefined} />
      <form action={recordWastage} className="card space-y-4 p-4">
        <IngredientQty ingredients={ingredients} qtyLabel="Quantity wasted" />
        <label className="block">
          <span className="label">Reason</span>
          <input name="reason" required list="reasons" className="input" placeholder="e.g. spoiled" />
          <datalist id="reasons">
            <option value="Spoiled" />
            <option value="Burnt" />
            <option value="Dropped" />
            <option value="Expired" />
            <option value="Staff meal" />
          </datalist>
        </label>
        <button className="btn-primary w-full">Save wastage</button>
      </form>
      <p className="mt-3 text-sm text-muted">Wastage shows in the sales report with its cost.</p>
    </div>
  );
}
