import { db } from "./db";

export type MenuEntry = { id: string; name: string; price: number; isVeg: boolean; isAvailable: boolean; description?: string };
export type MenuCategory = { id: string; name: string; items: MenuEntry[] };

export async function getMenu(outletId: string): Promise<MenuCategory[]> {
  const categories = await db.category.findMany({
    where: { outletId, active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      items: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, price: true, isVeg: true, isAvailable: true, description: true },
      },
    },
  });
  return categories.filter((c) => c.items.length > 0).map((c) => ({ id: c.id, name: c.name, items: c.items }));
}
