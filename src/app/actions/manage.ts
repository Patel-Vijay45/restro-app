"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import { parseRupees } from "@/lib/money";

function text(form: FormData, key: string, max = 80): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

/** Back to the page with an error (shown as a red message at the top). */
function back(path: string, error?: string): never {
  revalidatePath("/", "layout");
  redirect(error ? `${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}` : path);
}

/** Back to the page with a green "✓ saved" message at the top. */
function saved(path: string, message: string): never {
  revalidatePath("/", "layout");
  redirect(`${path}${path.includes("?") ? "&" : "?"}ok=${encodeURIComponent(message)}`);
}

// ---------- Menu ----------

export async function toggleAvailable(itemId: string, isAvailable: boolean) {
  const me = await requireStaff(CAN_MANAGE);
  await db.menuItem.updateMany({ where: { id: itemId, outletId: me.outletId }, data: { isAvailable } });
  revalidatePath("/", "layout");
}

export async function saveItem(form: FormData) {
  const me = await requireStaff(CAN_MANAGE);
  const id = text(form, "id");
  const path = id ? `/manage/menu/${id}` : "/manage/menu/new";
  const name = text(form, "name");
  const price = parseRupees(text(form, "price"));
  const categoryId = text(form, "categoryId");
  const isVeg = form.get("isVeg") === "veg";
  if (!name) back(path, "Enter the dish name");
  if (price === null || price <= 0) back(path, "Enter a valid price");
  const category = await db.category.findFirst({ where: { id: categoryId, outletId: me.outletId } });
  if (!category) back(path, "Choose a category");

  const data = {
    name,
    nameKn: text(form, "nameKn"),
    nameHi: text(form, "nameHi"),
    price,
    categoryId,
    isVeg,
    description: text(form, "description", 200),
  };
  if (id) {
    await db.menuItem.updateMany({ where: { id, outletId: me.outletId }, data });
  } else {
    await db.menuItem.create({ data: { ...data, outletId: me.outletId, sortOrder: 999 } });
  }
  saved("/manage/menu", id ? `${name} saved` : `${name} added to the menu`);
}

export async function removeItem(form: FormData) {
  const me = await requireStaff(CAN_MANAGE);
  // Kept in the database so old bills still show it; just hidden from the menu.
  await db.menuItem.updateMany({ where: { id: text(form, "id"), outletId: me.outletId }, data: { active: false } });
  saved("/manage/menu", "Dish removed from the menu");
}

export async function saveCategory(form: FormData) {
  const me = await requireStaff(CAN_MANAGE);
  const id = text(form, "id");
  const name = text(form, "name", 40);
  if (!name) back("/manage/menu", "Enter a category name");
  const names = { name, nameKn: text(form, "nameKn", 40), nameHi: text(form, "nameHi", 40) };
  if (id) {
    await db.category.updateMany({ where: { id, outletId: me.outletId }, data: names });
  } else {
    const count = await db.category.count({ where: { outletId: me.outletId } });
    await db.category.create({ data: { outletId: me.outletId, ...names, sortOrder: count } });
  }
  saved("/manage/menu", id ? "Category saved" : `Category ${name} added`);
}

// ---------- Tables ----------

export async function saveTable(form: FormData) {
  const me = await requireStaff(CAN_MANAGE);
  const id = text(form, "id");
  const name = text(form, "name", 12);
  const seats = parseInt(text(form, "seats") || "4", 10);
  if (!name) back("/manage/tables", "Enter a table name");
  if (!(seats > 0 && seats < 50)) back("/manage/tables", "Enter the number of seats");
  const clash = await db.diningTable.findFirst({ where: { outletId: me.outletId, name, NOT: id ? { id } : undefined } });
  if (clash) back("/manage/tables", `There is already a table called ${name}`);
  if (id) {
    await db.diningTable.updateMany({ where: { id, outletId: me.outletId }, data: { name, seats, active: true } });
  } else {
    const count = await db.diningTable.count({ where: { outletId: me.outletId } });
    await db.diningTable.create({ data: { outletId: me.outletId, name, seats, sortOrder: count } });
  }
  saved("/manage/tables", id ? `Table ${name} saved` : `Table ${name} added`);
}

export async function setTableActive(form: FormData) {
  const me = await requireStaff(CAN_MANAGE);
  const id = text(form, "id");
  const active = form.get("active") === "true";
  if (!active) {
    const running = await db.order.findFirst({ where: { tableId: id, status: { in: ["OPEN", "BILLED"] } } });
    if (running) back("/manage/tables", "This table has a running order");
  }
  await db.diningTable.updateMany({ where: { id, outletId: me.outletId }, data: { active } });
  saved("/manage/tables", active ? "Table is shown again" : "Table hidden");
}

// Staff, attendance and pay: see actions/staff.ts

// ---------- Outlet ----------

export async function saveOutlet(form: FormData) {
  const me = await requireStaff(CAN_MANAGE);
  const path = "/manage/outlet";
  const name = text(form, "name", 60);
  const paperWidth = parseInt(text(form, "paperWidth"), 10);
  const gstEnabled = form.get("gstEnabled") === "on";
  const gstRate = parseFloat(text(form, "gstRate") || "5");
  const upiId = text(form, "upiId", 60);
  if (!name) back(path, "Enter the outlet name");
  if (upiId && !/^[\w.\-]+@[\w.\-]+$/.test(upiId)) back(path, "UPI ID looks wrong (example: dfc@okaxis)");
  if (gstEnabled && !text(form, "gstin")) back(path, "Enter the GSTIN to turn on GST");
  if (!(gstRate >= 0 && gstRate <= 28)) back(path, "Enter a valid GST rate");
  const mapsUrl = text(form, "mapsUrl", 300);
  if (mapsUrl && !/^https:\/\/(maps\.app\.goo\.gl|goo\.gl|(www\.)?google\.[a-z.]+|maps\.google\.[a-z.]+)\//.test(mapsUrl)) {
    back(path, "Paste a Google Maps link (from Google Maps → Share → Copy link)");
  }

  await db.outlet.update({
    where: { id: me.outletId },
    data: {
      name,
      address: text(form, "address", 160),
      phone: text(form, "phone", 30),
      upiId,
      billFooter: text(form, "billFooter", 120),
      paperWidth: paperWidth === 58 ? 58 : 80,
      gstEnabled,
      gstin: text(form, "gstin", 15).toUpperCase(),
      gstRateBp: Math.round(gstRate * 100),
      tagline: text(form, "tagline", 80),
      hours: text(form, "hours", 80),
      mapsUrl,
      showOnWebsite: form.get("showOnWebsite") === "on",
    },
  });
  saved(path, "Outlet settings saved");
}

/** New QR secret for a table: the old printed QR stops working (use if a photo of it is being misused). */
export async function resetTableQr(form: FormData) {
  const me = await requireStaff(CAN_MANAGE);
  const { randomBytes } = await import("node:crypto");
  await db.diningTable.updateMany({
    where: { id: text(form, "id"), outletId: me.outletId },
    data: { qrToken: randomBytes(12).toString("base64url") },
  });
  saved("/manage/tables", "New QR made. Print it again: the old one no longer works.");
}
