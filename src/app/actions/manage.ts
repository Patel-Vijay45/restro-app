"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import { parseRupees } from "@/lib/money";
import { hashPin, isValidPin } from "@/lib/pin";

function text(form: FormData, key: string, max = 80): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

function back(path: string, error?: string): never {
  revalidatePath("/", "layout");
  redirect(error ? `${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}` : path);
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

  const data = { name, price, categoryId, isVeg, description: text(form, "description", 200) };
  if (id) {
    await db.menuItem.updateMany({ where: { id, outletId: me.outletId }, data });
  } else {
    await db.menuItem.create({ data: { ...data, outletId: me.outletId, sortOrder: 999 } });
  }
  back("/manage/menu");
}

export async function removeItem(form: FormData) {
  const me = await requireStaff(CAN_MANAGE);
  // Kept in the database so old bills still show it; just hidden from the menu.
  await db.menuItem.updateMany({ where: { id: text(form, "id"), outletId: me.outletId }, data: { active: false } });
  back("/manage/menu");
}

export async function saveCategory(form: FormData) {
  const me = await requireStaff(CAN_MANAGE);
  const id = text(form, "id");
  const name = text(form, "name", 40);
  if (!name) back("/manage/menu", "Enter a category name");
  if (id) {
    await db.category.updateMany({ where: { id, outletId: me.outletId }, data: { name } });
  } else {
    const count = await db.category.count({ where: { outletId: me.outletId } });
    await db.category.create({ data: { outletId: me.outletId, name, sortOrder: count } });
  }
  back("/manage/menu");
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
  back("/manage/tables");
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
  back("/manage/tables");
}

// ---------- Staff ----------

const MANAGER_CAN_ADD: Role[] = ["CASHIER", "WAITER", "KITCHEN"];

export async function saveStaff(form: FormData) {
  const me = await requireStaff(CAN_MANAGE);
  const id = text(form, "id");
  const name = text(form, "name", 40);
  const role = text(form, "role") as Role;
  const pin = text(form, "pin", 6);
  const path = "/manage/staff";

  if (!name) back(path, "Enter a name");
  if (!["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN"].includes(role)) back(path, "Choose a role");
  if (me.role !== "OWNER" && !MANAGER_CAN_ADD.includes(role)) back(path, "Only the owner can add owners or managers");
  if (!id && !isValidPin(pin)) back(path, "PIN must be 4 to 6 digits");
  if (id && pin && !isValidPin(pin)) back(path, "PIN must be 4 to 6 digits");

  // Owners work everywhere; everyone else belongs to the outlet being managed.
  const outletId = role === "OWNER" ? null : me.outletId;

  if (id) {
    const existing = await db.staff.findUnique({ where: { id } });
    if (!existing) back(path, "Staff not found");
    if (me.role !== "OWNER" && (existing.outletId !== me.outletId || !MANAGER_CAN_ADD.includes(existing.role))) {
      back(path, "You can't change this person");
    }
    if (existing.id === me.staffId && role !== me.role) back(path, "You can't change your own role");
    await db.staff.update({
      where: { id },
      data: { name, role, outletId, ...(pin ? { pinHash: hashPin(pin), failedPins: 0, lockedUntil: null } : {}) },
    });
  } else {
    await db.staff.create({ data: { name, role, outletId, pinHash: hashPin(pin) } });
  }
  back(path);
}

export async function setStaffActive(form: FormData) {
  const me = await requireStaff(CAN_MANAGE);
  const id = text(form, "id");
  const active = form.get("active") === "true";
  const target = await db.staff.findUnique({ where: { id } });
  if (!target) back("/manage/staff", "Staff not found");
  if (target.id === me.staffId) back("/manage/staff", "You can't turn off your own login");
  if (me.role !== "OWNER" && (target.outletId !== me.outletId || !MANAGER_CAN_ADD.includes(target.role))) {
    back("/manage/staff", "You can't change this person");
  }
  await db.staff.update({ where: { id }, data: { active } });
  back("/manage/staff");
}

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
    },
  });
  back(`${path}?saved=1`);
}

/** New QR secret for a table: the old printed QR stops working (use if a photo of it is being misused). */
export async function resetTableQr(form: FormData) {
  const me = await requireStaff(CAN_MANAGE);
  const { randomBytes } = await import("node:crypto");
  await db.diningTable.updateMany({
    where: { id: text(form, "id"), outletId: me.outletId },
    data: { qrToken: randomBytes(12).toString("base64url") },
  });
  back("/manage/tables?reset=1");
}
