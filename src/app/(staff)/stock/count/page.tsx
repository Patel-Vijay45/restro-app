import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import { saveCount } from "@/app/actions/stock";
import { UNIT_LABEL, formatQty } from "@/lib/units";
import BackHeader from "@/components/BackHeader";
import SubmitButton from "@/components/SubmitButton";

export default async function CountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await requireStaff(CAN_MANAGE);
  const { error } = await searchParams;
  const ingredients = await db.ingredient.findMany({ where: { outletId: me.outletId, active: true }, orderBy: { name: "asc" } });
  return (
    <div>
      <BackHeader title="Stock count" href="/stock" />
      <p className="mb-3 text-sm text-muted">
        Weigh or count what is actually in the kitchen and enter it. Leave a box empty to skip it. Differences are saved, so you can
        see what went missing.
      </p>
      <form action={saveCount}>
        <div className="card mb-4 divide-y divide-line">
          {ingredients.map((i) => (
            <label key={i.id} className="flex items-center gap-3 p-3">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{i.name}</span>
                <span className="text-xs text-muted">System says {formatQty(i.stock, i.unit)}</span>
              </span>
              <input name={`count_${i.id}`} inputMode="decimal" className="input w-24 text-right" aria-label={`${i.name} counted`} />
              <span className="w-8 text-sm text-muted">{UNIT_LABEL[i.unit].big}</span>
            </label>
          ))}
        </div>
        <SubmitButton className="btn-primary sticky bottom-20 w-full shadow-lg">Save count</SubmitButton>
      </form>
    </div>
  );
}
