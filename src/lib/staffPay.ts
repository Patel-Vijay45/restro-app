import "server-only";
import type { AttendanceStatus } from "@prisma/client";
import { db } from "./db";
import { daysInMonth, payFor, type PaySummary } from "./payroll";
import { indiaDay } from "./time";

export function currentMonth(): string {
  return indiaDay().slice(0, 7);
}

export function monthName(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function validMonth(v: string | undefined): string {
  return v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : currentMonth();
}

type StaffForPay = { id: string; salaryType: "MONTHLY" | "DAILY"; salary: number; joinedOn: string; leftOn: string };

/** Attendance marks and pay entries of one person for one month, and what they earned / are owed. */
export async function staffMonth(staff: StaffForPay, month: string) {
  const [marks, payments] = await Promise.all([
    db.attendance.findMany({ where: { staffId: staff.id, day: { startsWith: month } } }),
    db.staffPayment.findMany({
      where: { staffId: staff.id, month },
      orderBy: { createdAt: "asc" },
      include: { createdBy: { select: { name: true } } },
    }),
  ]);
  const attendance: Record<string, AttendanceStatus> = Object.fromEntries(marks.map((m) => [m.day, m.status]));
  const pay: PaySummary = payFor({ ...staff, month, today: indiaDay(), attendance, payments });
  return { attendance, payments, pay };
}

/** Everyone on the outlet's salary sheet for a month: not owners; joined by the end of the month; not left before it. */
export async function payrollStaff(outletId: string, month: string) {
  const first = `${month}-01`;
  const last = `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;
  const staff = await db.staff.findMany({
    where: { outletId, role: { not: "OWNER" } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return staff.filter((s) => (!s.joinedOn || s.joinedOn <= last) && (!s.leftOn || s.leftOn >= first) && (s.active || s.leftOn));
}
