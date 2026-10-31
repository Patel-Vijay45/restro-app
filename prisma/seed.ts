// Sample data so the app can be tried right away. Replace the menu and PINs with real ones before going live.
import { PrismaClient } from "@prisma/client";
import { hashPin } from "../src/lib/pin";

const db = new PrismaClient();

type SeedItem = [name: string, priceRupees: number, isVeg: boolean];

const restaurantMenu: Record<string, SeedItem[]> = {
  Starters: [
    ["Gobi Manchurian", 140, true],
    ["Paneer 65", 180, true],
    ["Chicken 65", 200, false],
    ["Chicken Kabab", 220, false],
    ["Fish Fry", 240, false],
  ],
  Biryani: [
    ["Veg Biryani", 150, true],
    ["Egg Biryani", 160, false],
    ["Chicken Biryani", 200, false],
    ["Mutton Biryani", 280, false],
  ],
  "Main Course": [
    ["Dal Fry", 120, true],
    ["Paneer Butter Masala", 190, true],
    ["Chicken Curry", 210, false],
    ["Butter Chicken", 240, false],
    ["Mutton Masala", 290, false],
  ],
  "Rice & Breads": [
    ["Jeera Rice", 110, true],
    ["Ghee Rice", 120, true],
    ["Chapati", 20, true],
    ["Butter Naan", 45, true],
  ],
  Drinks: [
    ["Sweet Lassi", 60, true],
    ["Fresh Lime Soda", 50, true],
    ["Soft Drink", 40, true],
  ],
};

const stallMenu: Record<string, SeedItem[]> = {
  Snacks: [
    ["Veg Puff", 30, true],
    ["French Fries", 90, true],
    ["Veg Roll", 80, true],
    ["Chicken Roll", 110, false],
    ["Chicken Shawarma", 120, false],
  ],
  Drinks: [
    ["Cold Coffee", 80, true],
    ["Lime Juice", 40, true],
  ],
};

async function addMenu(outletId: string, menu: Record<string, SeedItem[]>) {
  let catOrder = 0;
  for (const [categoryName, items] of Object.entries(menu)) {
    const category = await db.category.create({ data: { outletId, name: categoryName, sortOrder: catOrder++ } });
    await db.menuItem.createMany({
      data: items.map(([name, price, isVeg], i) => ({
        outletId,
        categoryId: category.id,
        name,
        price: price * 100,
        isVeg,
        sortOrder: i,
      })),
    });
  }
}

async function main() {
  if ((await db.outlet.count()) > 0) {
    console.log("Database already has data, skipping seed.");
    return;
  }

  const restaurant = await db.outlet.create({
    data: { name: "DFC Family Restaurant", type: "RESTAURANT", address: "Gajendragad", sortOrder: 0 },
  });
  const stall = await db.outlet.create({
    data: { name: "DFC Mall Stall", type: "COUNTER", address: "Gajendragad", paperWidth: 58, sortOrder: 1 },
  });

  await db.diningTable.createMany({
    data: Array.from({ length: 12 }, (_, i) => ({ outletId: restaurant.id, name: `T${i + 1}`, sortOrder: i })),
  });

  await addMenu(restaurant.id, restaurantMenu);
  await addMenu(stall.id, stallMenu);

  await db.staff.createMany({
    data: [
      { name: "Owner", role: "OWNER", pinHash: hashPin("1234"), outletId: null },
      { name: "Ravi (Waiter)", role: "WAITER", pinHash: hashPin("1111"), outletId: restaurant.id },
      { name: "Kitchen", role: "KITCHEN", pinHash: hashPin("2222"), outletId: restaurant.id },
      { name: "Counter", role: "CASHIER", pinHash: hashPin("3333"), outletId: restaurant.id },
      { name: "Stall", role: "CASHIER", pinHash: hashPin("4444"), outletId: stall.id },
    ],
  });

  console.log("Seeded: 2 outlets, 12 tables, sample menus, 5 staff logins.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
