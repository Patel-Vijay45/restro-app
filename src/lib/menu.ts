import { db } from "./db";
import { localName, type Lang } from "./i18n";

export type MenuEntry = { id: string; name: string; price: number; isVeg: boolean; isAvailable: boolean; description?: string; photoId?: string | null; category?: string; iconName?: string };
export type MenuCategory = { id: string; name: string; items: MenuEntry[] };

/** The menu of an outlet. Customer screens pass their language to get Kannada / Hindi names where set. */
export async function getMenu(outletId: string, lang: Lang = "en"): Promise<MenuCategory[]> {
  const categories = await db.category.findMany({
    where: { outletId, active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      items: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, nameKn: true, nameHi: true, price: true, isVeg: true, isAvailable: true, description: true, photoId: true },
      },
    },
  });
  return categories
    .filter((c) => c.items.length > 0)
    .map((c) => ({
      id: c.id,
      name: localName(lang, c),
      items: c.items.map(({ nameKn, nameHi, ...i }) => ({
        ...i,
        name: localName(lang, { name: i.name, nameKn, nameHi }),
        // English names pick the food icon
        category: c.name,
        iconName: i.name,
      })),
    }));
}
