"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { IngredientUnit } from "@prisma/client";
import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import { parseRupees } from "@/lib/money";
import { applyMove } from "@/lib/stock";
import { formatQty, parseBigQty, parseRecipeQty } from "@/lib/units";

function text(form: FormData, key: string, max = 80): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

function back(path: string, params: Record<string, string> = {}): never {
  revalidatePath("/", "layout");
  const q = new URLSearchParams(params).toString();
  redirect(q ? `${path}${path.includes("?") ? "&" : "?"}${q}` : path);
}

const UNITS: IngredientUnit[] = ["KG", "LITRE", "PIECE"];

export async function saveIngredient(form: FormData) {
  const me = await requireStaff(CAN_MANAGE);
  const id = text(form, "id");
  const path = id ? `/stock/${id}` : "/stock/new";
  const name = text(form, "name", 40);
  const unit = text(form, "unit") as IngredientUnit;
  const lowStock = parseBigQty(text(form, "lowStock") || "0");
  if (!name) back(path, { error: "Enter a name" });
  if (!UNITS.includes(unit)) back(path, { error: "Choose a unit" });
  if (lowStock === null) back(path, { error: "Enter the low-stock level as a number" });
  const clash = await db.ingredient.findFirst({ where: { outletId: me.outletId, name, NOT: id ? { id } : undefined } });
  if (clash) back(path, { error: `${name} already exists` });

  if (id) {
    const existing = await db.ingredient.findFirst({ where: { id, outletId: me.outletId }, include: { _count: { select: { moves: true } } } });
    if (!existing) back("/stock", { error: "Not found" });
    if (existing.unit !== unit && existing._count.moves > 0) {
      back(path, { error: "The unit can't change once stock has been recorded. Add a new ingredient instead." });
    }
    await db.ingredient.update({ where: { id }, data: { name, unit, lowStock } });
    back(path, { saved: "1" });
  }

  const opening = parseBigQty(text(form, "opening") || "0");
  const cost = parseRupees(text(form, "cost") || "0");
  if (opening === null) back(path, { error: "Enter the stock you have now as a number" });
  if (cost === null) back(path, { error: "Enter the price in rupees" });
  await db.$transaction(async (tx) => {
    const ingredient = await tx.ingredient.create({ data: { outletId: me.outletId, name, unit, lowStock, costPerUnit: cost } });
    if (opening > 0) {
      await applyMove(tx, { outletId: me.outletId, ingredientId: ingredient.id, type: "COUNT_ADJUST", qty: opening, note: "Opening stock", staffId: me.staffId });
    }
  });
  back("/stock", { saved: name });
}

export async function setIngredientActive(form: FormData) {
  const me = await requireStaff(CAN_MANAGE);
  const id = text(form, "id");
  const active = form.get("active") === "true";
  await db.ingredient.updateMany({ where: { id, outletId: me.outletId }, data: { active } });
  back(active ? `/stock/${id}` : "/stock");
}

async function findIngredient(outletId: string, id: string, path: string) {
  const ingredient = await db.ingredient.findFirst({ where: { id, outletId, active: true } });
  if (!ingredient) back(path, { error: "Choose an ingredient" });
  return ingredient;
}

export async function recordPurchase(form: FormData) {
  const me = await requireStaff(CAN_MANAGE);
  const path = "/stock/purchase";
  const ingredient = await findIngredient(me.outletId, text(form, "ingredientId"), path);
  const qty = parseBigQty(text(form, "qty"));
  const paid = parseRupees(text(form, "amount"));
  const supplier = text(form, "supplier", 60);
  if (!qty) back(path, { error: "Enter the quantity bought", supplier });
  if (paid === null) back(path, { error: "Enter the total amount paid (₹)", supplier });
  await db.$transaction((tx) =>
    applyMove(tx, {
      outletId: me.outletId,
      ingredientId: ingredient.id,
      type: "PURCHASE",
      qty,
      value: paid,
      supplier,
      note: text(form, "note", 120),
      staffId: me.staffId,
    }),
  );
  back(path, { saved: `${formatQty(qty, ingredient.unit)} ${ingredient.name}`, supplier });
}

export async function recordWastage(form: FormData) {
  const me = await requireStaff(CAN_MANAGE);
  const path = "/stock/wastage";
  const ingredient = await findIngredient(me.outletId, text(form, "ingredientId"), path);
  const qty = parseBigQty(text(form, "qty"));
  const reason = text(form, "reason", 120);
  if (!qty) back(path, { error: "Enter the quantity wasted" });
  if (!reason) back(path, { error: "Give a reason (e.g. spoiled, burnt, dropped)" });
  await db.$transaction((tx) =>
    applyMove(tx, { outletId: me.outletId, ingredientId: ingredient.id, type: "WASTAGE", qty: -qty, note: reason, staffId: me.staffId }),
  );
  back(path, { saved: `${formatQty(qty, ingredient.unit)} ${ingredient.name}` });
}

/** Physical stock count: for each counted ingredient, record the difference from the system. */
export async function saveCount(form: FormData) {
  const me = await requireStaff(CAN_MANAGE);
  const ingredients = await db.ingredient.findMany({ where: { outletId: me.outletId, active: true } });
  const counted: { id: string; qty: number }[] = [];
  for (const i of ingredients) {
    const raw = text(form, `count_${i.id}`);
    if (!raw) continue;
    const qty = parseBigQty(raw);
    if (qty === null) back("/stock/count", { error: `Check the number for ${i.name}` });
    counted.push({ id: i.id, qty });
  }
  if (counted.length === 0) back("/stock/count", { error: "Enter at least one count" });

  let changed = 0;
  await db.$transaction(async (tx) => {
    for (const c of counted) {
      const current = await tx.ingredient.findUniqueOrThrow({ where: { id: c.id } });
      const diff = c.qty - current.stock;
      if (diff === 0) continue;
      changed++;
      await applyMove(tx, { outletId: me.outletId, ingredientId: c.id, type: "COUNT_ADJUST", qty: diff, note: "Stock count", staffId: me.staffId });
    }
  });
  back("/stock", { counted: String(counted.length), changed: String(changed) });
}

/** Replace a dish's recipe. Form has repeated ingredientId[] and qty[] fields (qty in g / ml / pcs). */
export async function saveRecipe(form: FormData) {
  const me = await requireStaff(CAN_MANAGE);
  const menuItemId = text(form, "menuItemId");
  const path = `/manage/menu/${menuItemId}/recipe`;
  const item = await db.menuItem.findFirst({ where: { id: menuItemId, outletId: me.outletId } });
  if (!item) back("/manage/menu", { error: "Dish not found" });

  const ids = form.getAll("ingredientId").map(String);
  const qtys = form.getAll("qty").map(String);
  const ingredients = new Map(
    (await db.ingredient.findMany({ where: { id: { in: ids }, outletId: me.outletId } })).map((i) => [i.id, i]),
  );
  const lines = new Map<string, number>();
  for (let n = 0; n < ids.length; n++) {
    if (!ids[n] && !qtys[n]) continue;
    const ingredient = ingredients.get(ids[n]);
    if (!ingredient) back(path, { error: "Choose an ingredient on every row" });
    const qty = parseRecipeQty(qtys[n] ?? "", ingredient.unit);
    if (!qty) back(path, { error: `Enter the amount of ${ingredient.name}` });
    lines.set(ingredient.id, (lines.get(ingredient.id) ?? 0) + qty);
  }

  await db.$transaction([
    db.recipeLine.deleteMany({ where: { menuItemId } }),
    db.recipeLine.createMany({ data: [...lines].map(([ingredientId, qty]) => ({ menuItemId, ingredientId, qty })) }),
  ]);
  back(path, { saved: "1" });
}
