import "server-only";
import type { Prisma } from "@prisma/client";
import type { Me } from "./auth";
import { nextNumber } from "./counters";
import { deductForItems } from "./stock";

type Tx = Prisma.TransactionClient;

export type CartLine = { menuItemId: string; qty: number; note: string };

/** An error message meant for the person using the app (not a bug). */
export class UserError extends Error {}

/** Check the cart against the menu and copy names and prices from the database (never trust prices from the phone). */
export async function priceCart(tx: Tx, outletId: string, cart: CartLine[]) {
  const lines = cart.filter((l) => l.qty > 0);
  if (lines.length === 0) throw new UserError("Add at least one item");
  if (lines.some((l) => !Number.isInteger(l.qty) || l.qty > 99)) throw new UserError("Check the quantities");

  const items = await tx.menuItem.findMany({
    where: { id: { in: lines.map((l) => l.menuItemId) }, outletId, active: true },
  });
  const byId = new Map(items.map((i) => [i.id, i]));
  return lines.map((l) => {
    const item = byId.get(l.menuItemId);
    if (!item) throw new UserError("An item is no longer on the menu. Refresh and try again.");
    if (!item.isAvailable) throw new UserError(`${item.name} is sold out`);
    return {
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      isVeg: item.isVeg,
      qty: l.qty,
      note: l.note.trim().slice(0, 120),
    };
  });
}

export async function createKot(tx: Tx, me: Me, orderId: string, cart: CartLine[]) {
  const lines = await priceCart(tx, me.outletId, cart);
  const number = await nextNumber(tx, me.outletId, "kot");
  const kot = await tx.kot.create({
    data: { outletId: me.outletId, orderId, number, createdById: me.staffId },
  });
  const items = await tx.orderItem.createManyAndReturn({
    data: lines.map((l) => ({ ...l, orderId, kotId: kot.id })),
    select: { id: true, menuItemId: true, qty: true },
  });
  await deductForItems(tx, me.outletId, me.staffId, items);
  return kot;
}


/** The running order for a table, opening a new one if the table is free. */
export async function tableOrderId(tx: Tx, me: Me, tableId: string, guests?: number): Promise<string> {
  const table = await tx.diningTable.findFirst({ where: { id: tableId, outletId: me.outletId, active: true } });
  if (!table) throw new UserError("Table not found");
  // Two waiters at the same table at once must not open two orders.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${table.id}))`;
  const running = await tx.order.findFirst({ where: { tableId: table.id, status: { in: ["OPEN", "BILLED"] } } });
  if (running) {
    if (running.status === "BILLED") await tx.order.update({ where: { id: running.id }, data: { status: "OPEN" } });
    return running.id;
  }
  const order = await tx.order.create({
    data: {
      outletId: me.outletId,
      type: "DINE_IN",
      tableId: table.id,
      guests: guests && guests > 0 ? guests : null,
      createdById: me.staffId,
    },
  });
  return order.id;
}
