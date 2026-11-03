"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AttendanceStatus, MoneyMode, Role, SalaryType, StaffPaymentKind } from "@prisma/client";
import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff, type Me } from "@/lib/auth";
import { parseRupees } from "@/lib/money";
import { hashPin, isValidPin } from "@/lib/pin";
import { indiaDay } from "@/lib/time";

// Staff, attendance and pay.
// - Owner and managers: add / change staff (managers: cashiers, waiters, kitchen, helpers of their outlet), attendance.
// - Owner only: salary amounts, advances, bonuses, deductions, salary payments.

function text(form: FormData, key: string, max = 80): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

function go(path: string, kind: "ok" | "error", message: string): never {
  revalidatePath("/", "layout");
  redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(message)}`);
}

const ROLES: Role[] = ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN", "HELPER"];
const MANAGER_CAN_MANAGE: Role[] = ["CASHIER", "WAITER", "KITCHEN", "HELPER"];
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;

/** The staff member, if the logged-in person may manage them (same outlet; managers not owners/managers). */
async function manageable(me: Me, staffId: string) {
  const s = await db.staff.findUnique({ where: { id: staffId } });
  if (!s) return null;
  if (me.role === "OWNER") return s;
  if (s.outletId !== me.outletId || !MANAGER_CAN_MANAGE.includes(s.role)) return null;
  return s;
}

export async function saveStaff(form: FormData) {
  const me = await requireStaff(CAN_MANAGE);
  const id = text(form, "id");
  const path = id ? `/manage/staff/${id}` : "/manage/staff/new";
  const name = text(form, "name", 40);
  const role = text(form, "role") as Role;
  const pin = text(form, "pin", 6);
  const phone = text(form, "phone", 20).replace(/\D/g, "").slice(-10);
  const joinedOn = text(form, "joinedOn", 10);

  if (!name) go(path, "error", "Enter a name");
  if (!ROLES.includes(role)) go(path, "error", "Choose a job");
  if (me.role !== "OWNER" && !MANAGER_CAN_MANAGE.includes(role)) go(path, "error", "Only the owner can add owners or managers");
  if (phone && phone.length !== 10) go(path, "error", "Enter a 10-digit mobile number, or leave it empty");
  if (joinedOn && !DAY.test(joinedOn)) go(path, "error", "Check the joining date");
  if (pin && !isValidPin(pin)) go(path, "error", "PIN must be 4 to 6 digits");

  // Pay is set by the owner only; others' forms don't send it.
  let pay: { salaryType: SalaryType; salary: number } | undefined;
  if (me.role === "OWNER" && form.has("salary")) {
    const salaryType = text(form, "salaryType") === "DAILY" ? "DAILY" : "MONTHLY";
    const salary = parseRupees(text(form, "salary") || "0");
    if (salary === null) go(path, "error", "Enter the salary in rupees");
    pay = { salaryType, salary };
  }

  const outletId = role === "OWNER" ? null : me.outletId;
  const details = { name, role, outletId, phone, joinedOn, note: text(form, "note", 200), ...pay };

  if (id) {
    const existing = await manageable(me, id);
    if (!existing) go("/manage/staff", "error", "You can't change this person");
    if (existing.id === me.staffId && role !== me.role) go(path, "error", "You can't change your own job");
    // Someone moving from helper to a job with a login needs a PIN.
    if (role !== "HELPER" && !existing.pinHash && !pin) go(path, "error", "Give a PIN so this person can log in");
    await db.staff.update({
      where: { id },
      data: { ...details, ...(pin ? { pinHash: hashPin(pin), failedPins: 0, lockedUntil: null } : {}) },
    });
    go(path, "ok", `${name} saved`);
  }

  if (role !== "HELPER" && !pin) go(path, "error", "Give a PIN (4–6 digits) so this person can log in");
  const created = await db.staff.create({
    data: { ...details, joinedOn: joinedOn || indiaDay(), pinHash: role === "HELPER" ? "" : hashPin(pin) },
  });
  go(`/manage/staff/${created.id}`, "ok", `${name} added`);
}

/** Turn a login off (person left: pay stops after today) or back on. */
export async function setStaffActive(form: FormData) {
  const me = await requireStaff(CAN_MANAGE);
  const id = text(form, "id");
  const active = form.get("active") === "true";
  const target = await manageable(me, id);
  if (!target) go("/manage/staff", "error", "You can't change this person");
  if (target.id === me.staffId) go(`/manage/staff/${id}`, "error", "You can't turn off yourself");
  await db.staff.update({ where: { id }, data: { active, leftOn: active ? "" : target.leftOn || indiaDay() } });
  go(`/manage/staff/${id}`, "ok", active ? `${target.name} is back on the staff list` : `${target.name} marked as left. Pay stops after today.`);
}

/** Attendance for one person and day. PRESENT is the normal state. */
export async function markAttendance(staffId: string, day: string, status: AttendanceStatus): Promise<{ ok: boolean; error?: string }> {
  const me = await requireStaff(CAN_MANAGE);
  if (!DAY.test(day)) return { ok: false, error: "Wrong date" };
  if (!["PRESENT", "HALF_DAY", "ABSENT", "PAID_LEAVE"].includes(status)) return { ok: false, error: "Wrong status" };
  const staff = await manageable(me, staffId);
  if (!staff || staff.role === "OWNER") return { ok: false, error: "You can't mark this person" };
  await db.attendance.upsert({
    where: { staffId_day: { staffId, day } },
    create: { staffId, day, status, markedById: me.staffId },
    update: { status, markedById: me.staffId },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

const KIND_TEXT: Record<StaffPaymentKind, string> = {
  ADVANCE: "Advance",
  SALARY: "Salary payment",
  BONUS: "Bonus",
  DEDUCTION: "Deduction",
};

/** Owner: advance, salary payment, bonus or deduction. */
export async function addStaffPayment(form: FormData) {
  const me = await requireStaff(["OWNER"]);
  const staffId = text(form, "staffId");
  const back = text(form, "back", 200) || `/manage/staff/${staffId}`;
  const kind = text(form, "kind") as StaffPaymentKind;
  const month = text(form, "month", 7);
  const amount = parseRupees(text(form, "amount"));
  const mode = text(form, "mode") as MoneyMode;
  if (!KIND_TEXT[kind]) go(back, "error", "Choose what this is");
  if (!MONTH.test(month)) go(back, "error", "Choose the salary month");
  if (!amount || amount <= 0) go(back, "error", "Enter the amount in rupees");
  const cash = kind === "ADVANCE" || kind === "SALARY";
  if (cash && !["CASH", "UPI", "BANK"].includes(mode)) go(back, "error", "Choose cash, UPI or bank");
  const staff = await db.staff.findUnique({ where: { id: staffId } });
  if (!staff || staff.role === "OWNER") go(back, "error", "Staff not found");
  await db.staffPayment.create({
    data: { staffId, kind, amount, month, mode: cash ? mode : null, note: text(form, "note", 120), createdById: me.staffId },
  });
  go(back, "ok", `${KIND_TEXT[kind]} of ₹${(amount / 100).toLocaleString("en-IN")} saved for ${staff.name}`);
}

/** Owner: cancel a wrong entry. It stays in the history, crossed out, with the reason. */
export async function voidStaffPayment(paymentId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  const me = await requireStaff(["OWNER"]);
  if (!reason.trim()) return { ok: false, error: "Give a reason" };
  await db.staffPayment.updateMany({
    where: { id: paymentId, voided: false },
    data: { voided: true, voidReason: `${reason.trim().slice(0, 120)} (by ${me.name})` },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
