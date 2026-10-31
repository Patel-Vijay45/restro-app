import "server-only";
import { db } from "./db";
import { UNIT_LABEL, formatQty } from "./units";
import type { IngredientOption } from "@/components/IngredientQty";

export async function ingredientOptions(outletId: string): Promise<IngredientOption[]> {
  const list = await db.ingredient.findMany({ where: { outletId, active: true }, orderBy: { name: "asc" } });
  return list.map((i) => ({ id: i.id, name: i.name, unit: UNIT_LABEL[i.unit].big, stockText: formatQty(i.stock, i.unit) }));
}

/** Ingredients at or below their low-stock level. */
export async function lowStockCount(outletId: string): Promise<number> {
  const rows = await db.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM "Ingredient" WHERE "outletId" = ${outletId} AND active AND stock <= "lowStock"`;
  return Number(rows[0]?.n ?? 0);
}
