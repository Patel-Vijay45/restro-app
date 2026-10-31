import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import { rupees } from "@/lib/money";
import { UNIT_LABEL } from "@/lib/units";
import BackHeader from "@/components/BackHeader";
import Notice from "@/components/Notice";
import RecipeEditor from "./RecipeEditor";

export default async function RecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const me = await requireStaff(CAN_MANAGE);
  const { itemId } = await params;
  const sp = await searchParams;
  const item = await db.menuItem.findFirst({
    where: { id: itemId, outletId: me.outletId, active: true },
    include: { recipe: { include: { ingredient: true } } },
  });
  if (!item) notFound();
  const ingredients = await db.ingredient.findMany({ where: { outletId: me.outletId, active: true }, orderBy: { name: "asc" } });

  return (
    <div>
      <BackHeader title={`Recipe: ${item.name}`} href={`/manage/menu/${item.id}`} />
      <Notice error={sp.error} success={sp.saved ? "Recipe saved. Stock will go down by these amounts for every portion ordered." : undefined} />
      <p className="mb-3 text-sm text-muted">
        How much of each ingredient <b>one portion</b> uses. Selling price {rupees(item.price)}.
      </p>
      {ingredients.length === 0 ? (
        <p className="card p-4 text-sm">
          Add ingredients first in{" "}
          <Link href="/stock/new" className="underline">
            Stock → + Ingredient
          </Link>
          .
        </p>
      ) : (
        <RecipeEditor
          menuItemId={item.id}
          price={item.price}
          ingredients={ingredients.map((i) => ({ id: i.id, name: i.name, small: UNIT_LABEL[i.unit].small, isPiece: i.unit === "PIECE", costPerUnit: i.costPerUnit }))}
          initial={item.recipe.map((r) => ({
            ingredientId: r.ingredientId,
            qty: String(r.ingredient.unit === "PIECE" ? r.qty / 1000 : r.qty),
          }))}
        />
      )}
    </div>
  );
}
