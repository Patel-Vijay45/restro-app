// Sample data so the app can be tried right away. Replace the menu and PINs with real ones before going live.
import { PrismaClient, type IngredientUnit } from "@prisma/client";
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


// Kannada and Hindi names for the sample dishes and categories (customers can switch language on the website / QR page).
const TRANSLATIONS: Record<string, [kn: string, hi: string]> = {
  Starters: ["ಸ್ಟಾರ್ಟರ್ಸ್", "स्टार्टर्स"],
  Biryani: ["ಬಿರಿಯಾನಿ", "बिरयानी"],
  "Main Course": ["ಮುಖ್ಯ ಊಟ", "मेन कोर्स"],
  "Rice & Breads": ["ಅನ್ನ ಮತ್ತು ರೊಟ್ಟಿ", "चावल और रोटी"],
  Drinks: ["ಪಾನೀಯಗಳು", "पेय"],
  Snacks: ["ಸ್ನ್ಯಾಕ್ಸ್", "स्नैक्स"],
  "Gobi Manchurian": ["ಗೋಬಿ ಮಂಚೂರಿ", "गोभी मंचूरियन"],
  "Paneer 65": ["ಪನೀರ್ 65", "पनीर 65"],
  "Chicken 65": ["ಚಿಕನ್ 65", "चिकन 65"],
  "Chicken Kabab": ["ಚಿಕನ್ ಕಬಾಬ್", "चिकन कबाब"],
  "Fish Fry": ["ಮೀನು ಫ್ರೈ", "फिश फ्राई"],
  "Veg Biryani": ["ವೆಜ್ ಬಿರಿಯಾನಿ", "वेज बिरयानी"],
  "Egg Biryani": ["ಮೊಟ್ಟೆ ಬಿರಿಯಾನಿ", "अंडा बिरयानी"],
  "Chicken Biryani": ["ಚಿಕನ್ ಬಿರಿಯಾನಿ", "चिकन बिरयानी"],
  "Mutton Biryani": ["ಮಟನ್ ಬಿರಿಯಾನಿ", "मटन बिरयानी"],
  "Dal Fry": ["ದಾಲ್ ಫ್ರೈ", "दाल फ्राई"],
  "Paneer Butter Masala": ["ಪನೀರ್ ಬಟರ್ ಮಸಾಲಾ", "पनीर बटर मसाला"],
  "Chicken Curry": ["ಚಿಕನ್ ಕರಿ", "चिकन करी"],
  "Butter Chicken": ["ಬಟರ್ ಚಿಕನ್", "बटर चिकन"],
  "Mutton Masala": ["ಮಟನ್ ಮಸಾಲಾ", "मटन मसाला"],
  "Jeera Rice": ["ಜೀರಾ ರೈಸ್", "जीरा राइस"],
  "Ghee Rice": ["ತುಪ್ಪದ ಅನ್ನ", "घी राइस"],
  Chapati: ["ಚಪಾತಿ", "चपाती"],
  "Butter Naan": ["ಬಟರ್ ನಾನ್", "बटर नान"],
  "Sweet Lassi": ["ಸಿಹಿ ಲಸ್ಸಿ", "मीठी लस्सी"],
  "Fresh Lime Soda": ["ಫ್ರೆಶ್ ಲೈಮ್ ಸೋಡಾ", "फ्रेश लाइम सोडा"],
  "Soft Drink": ["ತಂಪು ಪಾನೀಯ", "सॉफ्ट ड्रिंक"],
  "Veg Puff": ["ವೆಜ್ ಪಫ್", "वेज पफ"],
  "French Fries": ["ಫ್ರೆಂಚ್ ಫ್ರೈಸ್", "फ्रेंच फ्राइज़"],
  "Veg Roll": ["ವೆಜ್ ರೋಲ್", "वेज रोल"],
  "Chicken Roll": ["ಚಿಕನ್ ರೋಲ್", "चिकन रोल"],
  "Chicken Shawarma": ["ಚಿಕನ್ ಶವರ್ಮಾ", "चिकन शवरमा"],
  "Cold Coffee": ["ಕೋಲ್ಡ್ ಕಾಫಿ", "कोल्ड कॉफ़ी"],
  "Lime Juice": ["ನಿಂಬೆ ಜ್ಯೂಸ್", "नींबू पानी"],
};
const tr = (name: string) => ({ nameKn: TRANSLATIONS[name]?.[0] ?? "", nameHi: TRANSLATIONS[name]?.[1] ?? "" });

/** Older databases: fill in Kannada / Hindi names that are still empty (never overwrites names typed by staff). */
async function addTranslations(): Promise<number> {
  let n = 0;
  for (const [name, [nameKn, nameHi]] of Object.entries(TRANSLATIONS)) {
    n += (await db.menuItem.updateMany({ where: { name, nameKn: "", nameHi: "" }, data: { nameKn, nameHi } })).count;
    n += (await db.category.updateMany({ where: { name, nameKn: "", nameHi: "" }, data: { nameKn, nameHi } })).count;
  }
  return n;
}

async function addMenu(outletId: string, menu: Record<string, SeedItem[]>) {
  let catOrder = 0;
  for (const [categoryName, items] of Object.entries(menu)) {
    const category = await db.category.create({ data: { outletId, name: categoryName, ...tr(categoryName), sortOrder: catOrder++ } });
    await db.menuItem.createMany({
      data: items.map(([name, price, isVeg], i) => ({
        outletId,
        categoryId: category.id,
        name,
        ...tr(name),
        price: price * 100,
        isVeg,
        sortOrder: i,
      })),
    });
  }
}


// ---------- Sample inventory ----------
// [name, unit, stock now (kg / L / pcs), warn at, price per kg / L / pc in ₹]
type SeedIngredient = [string, IngredientUnit, number, number, number];
// dish -> [ingredient, amount per portion in g / ml / pcs]
type SeedRecipes = Record<string, [string, number][]>;

const restaurantIngredients: SeedIngredient[] = [
  ["Chicken", "KG", 12, 3, 240],
  ["Mutton", "KG", 4, 1, 750],
  ["Fish", "KG", 3, 1, 400],
  ["Paneer", "KG", 3, 1, 380],
  ["Eggs", "PIECE", 60, 12, 6],
  ["Basmati Rice", "KG", 20, 5, 110],
  ["Toor Dal", "KG", 5, 1, 140],
  ["Wheat Flour", "KG", 10, 3, 45],
  ["Maida", "KG", 5, 1, 50],
  ["Cauliflower", "PIECE", 8, 2, 30],
  ["Onion", "KG", 15, 4, 35],
  ["Tomato", "KG", 8, 2, 30],
  ["Cooking Oil", "LITRE", 15, 4, 150],
  ["Ghee", "LITRE", 0.4, 0.5, 600],
  ["Butter", "KG", 1.5, 0.5, 520],
  ["Curd", "LITRE", 5, 1, 60],
  ["Milk", "LITRE", 5, 1, 56],
  ["Lemon", "PIECE", 30, 10, 4],
  ["Sugar", "KG", 5, 1, 45],
  ["Soft Drink Bottle", "PIECE", 24, 6, 32],
];

const restaurantRecipes: SeedRecipes = {
  "Gobi Manchurian": [["Cauliflower", 0.5], ["Maida", 50], ["Cooking Oil", 60], ["Onion", 30]],
  "Paneer 65": [["Paneer", 150], ["Maida", 30], ["Cooking Oil", 50], ["Curd", 30]],
  "Chicken 65": [["Chicken", 250], ["Cooking Oil", 60], ["Curd", 30]],
  "Chicken Kabab": [["Chicken", 250], ["Cooking Oil", 60], ["Eggs", 1]],
  "Fish Fry": [["Fish", 250], ["Cooking Oil", 50]],
  "Veg Biryani": [["Basmati Rice", 150], ["Onion", 50], ["Tomato", 40], ["Cooking Oil", 30], ["Ghee", 10]],
  "Egg Biryani": [["Basmati Rice", 150], ["Eggs", 2], ["Onion", 50], ["Cooking Oil", 30]],
  "Chicken Biryani": [["Basmati Rice", 150], ["Chicken", 200], ["Onion", 60], ["Curd", 40], ["Cooking Oil", 30], ["Ghee", 10]],
  "Mutton Biryani": [["Basmati Rice", 150], ["Mutton", 200], ["Onion", 60], ["Curd", 40], ["Cooking Oil", 30], ["Ghee", 15]],
  "Dal Fry": [["Toor Dal", 80], ["Onion", 30], ["Tomato", 30], ["Cooking Oil", 15]],
  "Paneer Butter Masala": [["Paneer", 150], ["Butter", 25], ["Tomato", 100], ["Onion", 50], ["Milk", 30]],
  "Chicken Curry": [["Chicken", 250], ["Onion", 80], ["Tomato", 60], ["Cooking Oil", 40]],
  "Butter Chicken": [["Chicken", 250], ["Butter", 30], ["Tomato", 100], ["Milk", 40]],
  "Mutton Masala": [["Mutton", 250], ["Onion", 80], ["Tomato", 60], ["Cooking Oil", 40]],
  "Jeera Rice": [["Basmati Rice", 150], ["Ghee", 10]],
  "Ghee Rice": [["Basmati Rice", 150], ["Ghee", 20]],
  Chapati: [["Wheat Flour", 40], ["Cooking Oil", 5]],
  "Butter Naan": [["Maida", 80], ["Butter", 10], ["Curd", 10]],
  "Sweet Lassi": [["Curd", 250], ["Sugar", 30]],
  "Fresh Lime Soda": [["Lemon", 1], ["Sugar", 20]],
  "Soft Drink": [["Soft Drink Bottle", 1]],
};

const stallIngredients: SeedIngredient[] = [
  ["Chicken", "KG", 4, 1, 240],
  ["Rumali Roti", "PIECE", 40, 10, 8],
  ["Puff Pastry", "PIECE", 30, 10, 12],
  ["Frozen Fries", "KG", 5, 1, 180],
  ["Mixed Veg", "KG", 3, 1, 60],
  ["Cooking Oil", "LITRE", 5, 1, 150],
  ["Mayonnaise", "KG", 0.4, 0.5, 220],
  ["Milk", "LITRE", 5, 1, 56],
  ["Coffee Powder", "KG", 0.5, 0.1, 900],
  ["Sugar", "KG", 3, 1, 45],
  ["Lemon", "PIECE", 30, 10, 4],
];

const stallRecipes: SeedRecipes = {
  "Veg Puff": [["Puff Pastry", 1], ["Mixed Veg", 40]],
  "French Fries": [["Frozen Fries", 150], ["Cooking Oil", 30]],
  "Veg Roll": [["Rumali Roti", 1], ["Mixed Veg", 80], ["Mayonnaise", 20]],
  "Chicken Roll": [["Rumali Roti", 1], ["Chicken", 100], ["Mayonnaise", 20], ["Cooking Oil", 10]],
  "Chicken Shawarma": [["Rumali Roti", 1], ["Chicken", 120], ["Mayonnaise", 30]],
  "Cold Coffee": [["Milk", 250], ["Coffee Powder", 10], ["Sugar", 25]],
  "Lime Juice": [["Lemon", 1], ["Sugar", 25]],
};

async function addInventory(outletId: string, list: SeedIngredient[], recipes: SeedRecipes) {
  if ((await db.ingredient.count({ where: { outletId } })) > 0) return false;
  const ids = new Map<string, { id: string; unit: IngredientUnit }>();
  for (const [name, unit, stock, low, price] of list) {
    const ing = await db.ingredient.create({
      data: { outletId, name, unit, stock: Math.round(stock * 1000), lowStock: Math.round(low * 1000), costPerUnit: price * 100 },
    });
    ids.set(name, { id: ing.id, unit });
    await db.stockMove.create({
      data: { outletId, ingredientId: ing.id, type: "COUNT_ADJUST", qty: ing.stock, value: Math.round(stock * price * 100), note: "Opening stock" },
    });
  }
  const dishes = await db.menuItem.findMany({ where: { outletId, active: true } });
  for (const dish of dishes) {
    const lines = recipes[dish.name];
    if (!lines) continue;
    await db.recipeLine.createMany({
      data: lines.map(([name, amount]) => {
        const ing = ids.get(name)!;
        // recipe amounts: grams / ml are already "milli" of kg / L; pieces need * 1000
        return { menuItemId: dish.id, ingredientId: ing.id, qty: ing.unit === "PIECE" ? Math.round(amount * 1000) : amount };
      }),
    });
  }
  return true;
}

// Sample pay: [name, salary type, ₹ amount, phone]. Joined at the start of last month, so last month's salary sheet is complete.
const SAMPLE_PAY: [string, "MONTHLY" | "DAILY", number, string][] = [
  ["Ravi (Waiter)", "MONTHLY", 12000, "9800000001"],
  ["Kitchen", "MONTHLY", 18000, "9800000002"],
  ["Counter", "MONTHLY", 14000, "9800000003"],
  ["Stall", "MONTHLY", 12000, "9800000004"],
  ["Shankar (Helper)", "DAILY", 500, "9800000005"],
];

function startOfLastMonth(): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const [y, m] = today.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 10);
}

/** Salaries, phones and a helper for the sample staff, if no salary has been set yet (never changes real data). */
async function addSamplePay(restaurantId: string): Promise<boolean> {
  if ((await db.staff.count({ where: { salary: { gt: 0 } } })) > 0) return false;
  if (!(await db.staff.findFirst({ where: { name: "Shankar (Helper)" } }))) {
    await db.staff.create({ data: { name: "Shankar (Helper)", role: "HELPER", pinHash: "", outletId: restaurantId } });
  }
  const joinedOn = startOfLastMonth();
  for (const [name, salaryType, rupees, phone] of SAMPLE_PAY) {
    await db.staff.updateMany({ where: { name, salary: 0 }, data: { salaryType, salary: rupees * 100, phone, joinedOn } });
  }
  return true;
}

async function main() {
  if ((await db.outlet.count()) > 0) {
    // Older databases: add sample stock and recipes if they have none yet.
    const outlets = await db.outlet.findMany();
    let added = 0;
    for (const o of outlets) {
      const ok = await addInventory(o.id, o.type === "RESTAURANT" ? restaurantIngredients : stallIngredients, o.type === "RESTAURANT" ? restaurantRecipes : stallRecipes);
      if (ok) added++;
    }
    const translated = await addTranslations();
    const restaurantOutlet = outlets.find((o) => o.type === "RESTAURANT");
    const pay = restaurantOutlet ? await addSamplePay(restaurantOutlet.id) : false;
    if (pay) console.log("Added sample salaries and a helper (Shankar) to the staff.");
    if (added) console.log(`Added sample stock and recipes to ${added} outlet(s).`);
    if (translated) console.log(`Added Kannada / Hindi names to ${translated} sample dishes and categories.`);
    if (!added && !translated && !pay) console.log("Database already has data, skipping seed.");
    return;
  }

  const restaurant = await db.outlet.create({
    data: {
      name: "DFC Family Restaurant",
      type: "RESTAURANT",
      address: "Gajendragad, Karnataka",
      phone: "8160123021",
      tagline: "Veg & non-veg family dining",
      hours: "Every day, 11 AM – 11 PM",
      mapsUrl: "https://maps.google.com/?cid=8078862460556497123",
      sortOrder: 0,
    },
  });
  const stall = await db.outlet.create({
    data: {
      name: "DFC Mall Stall",
      type: "COUNTER",
      address: "Mall, Gajendragad",
      phone: "8160123021",
      tagline: "Quick bites, rolls and shakes",
      hours: "Every day, 11 AM – 10 PM",
      paperWidth: 58,
      sortOrder: 1,
    },
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

  await addSamplePay(restaurant.id);
  await addInventory(restaurant.id, restaurantIngredients, restaurantRecipes);
  await addInventory(stall.id, stallIngredients, stallRecipes);

  console.log("Seeded: 2 outlets, 12 tables, sample menus with recipes, sample stock, 5 staff logins, a helper, sample salaries.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
