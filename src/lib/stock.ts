import "server-only";
import type { Prisma, StockMoveType } from "@prisma/client";
import { averageCost, costOf } from "./units";

type Tx = Prisma.TransactionClient;

/** Record one stock change and update the ingredient's stock (and average cost, for purchases). */
export async function applyMove(
  tx: Tx,
  move: {
    outletId: string;
    ingredientId: string;
    type: StockMoveType;
    qty: number;
    value?: number;
    supplier?: string;
    note?: string;
    staffId?: string | null;
    orderItemId?: string | null;
  },
) {
  const ingredient = await tx.ingredient.findFirstOrThrow({ where: { id: move.ingredientId, outletId: move.outletId } });
  const value = move.value ?? costOf(Math.abs(move.qty), ingredient.costPerUnit);
  await tx.stockMove.create({
    data: {
      outletId: move.outletId,
      ingredientId: ingredient.id,
      type: move.type,
      qty: move.qty,
      value,
      supplier: move.supplier ?? "",
      note: move.note ?? "",
      staffId: move.staffId ?? null,
      orderItemId: move.orderItemId ?? null,
    },
  });
  await tx.ingredient.update({
    where: { id: ingredient.id },
    data: {
      stock: { increment: move.qty },
      ...(move.type === "PURCHASE" ? { costPerUnit: averageCost(ingredient.stock, ingredient.costPerUnit, move.qty, value) } : {}),
    },
  });
}

/** Take the recipe amounts out of stock for items just sent to the kitchen. Dishes without a recipe are skipped. */
export async function deductForItems(
  tx: Tx,
  outletId: string,
  staffId: string | null,
  items: { id: string; menuItemId: string; qty: number }[],
) {
  if (items.length === 0) return;
  const lines = await tx.recipeLine.findMany({
    where: { menuItemId: { in: items.map((i) => i.menuItemId) }, ingredient: { active: true } },
    include: { ingredient: true },
  });
  if (lines.length === 0) return;

  const moves: Prisma.StockMoveCreateManyInput[] = [];
  const perIngredient = new Map<string, number>();
  for (const item of items) {
    for (const line of lines.filter((l) => l.menuItemId === item.menuItemId)) {
      const qty = line.qty * item.qty;
      moves.push({
        outletId,
        ingredientId: line.ingredientId,
        type: "SALE",
        qty: -qty,
        value: costOf(qty, line.ingredient.costPerUnit),
        orderItemId: item.id,
        staffId,
      });
      perIngredient.set(line.ingredientId, (perIngredient.get(line.ingredientId) ?? 0) + qty);
    }
  }
  await tx.stockMove.createMany({ data: moves });
  for (const [ingredientId, qty] of perIngredient) {
    await tx.ingredient.update({ where: { id: ingredientId }, data: { stock: { decrement: qty } } });
  }
}

/** Put stock back for removed items, if the kitchen hadn't started cooking them. */
export async function returnForItems(tx: Tx, staffId: string, orderItemIds: string[]) {
  if (orderItemIds.length === 0) return;
  const sales = await tx.stockMove.findMany({ where: { orderItemId: { in: orderItemIds }, type: "SALE" } });
  const returned = new Set(
    (await tx.stockMove.findMany({ where: { orderItemId: { in: orderItemIds }, type: "CANCEL_RETURN" }, select: { ingredientId: true, orderItemId: true } })).map(
      (m) => `${m.orderItemId}:${m.ingredientId}`,
    ),
  );
  for (const sale of sales) {
    if (returned.has(`${sale.orderItemId}:${sale.ingredientId}`)) continue;
    await tx.stockMove.create({
      data: {
        outletId: sale.outletId,
        ingredientId: sale.ingredientId,
        type: "CANCEL_RETURN",
        qty: -sale.qty,
        value: sale.value,
        orderItemId: sale.orderItemId,
        staffId,
        note: "Removed before cooking",
      },
    });
    await tx.ingredient.update({ where: { id: sale.ingredientId }, data: { stock: { increment: -sale.qty } } });
  }
}
