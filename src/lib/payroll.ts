import type { AttendanceStatus, SalaryType, StaffPaymentKind } from "@prisma/client";

// Salary maths. Pure functions (no database) so they are easy to test. Money in paise.
//
// Days without an attendance mark count as PRESENT: staff only mark absences, half days and paid leave.
// MONTHLY salary: salary × payable days ÷ days in the month (the usual method in Indian small businesses).
// DAILY wage: wage × payable days.

export type PayInput = {
  salaryType: SalaryType;
  salary: number;
  joinedOn: string; // "YYYY-MM-DD" or ""
  leftOn: string; // "YYYY-MM-DD" or ""
  month: string; // "YYYY-MM"
  today: string; // "YYYY-MM-DD": days after today are not counted yet
  attendance: Record<string, AttendanceStatus>; // day -> status
  payments: { kind: StaffPaymentKind; amount: number; voided?: boolean }[];
};

export type PaySummary = {
  daysInMonth: number;
  countedDays: number; // days that are part of the job so far (after joining, before leaving, up to today)
  present: number;
  halfDays: number;
  absent: number;
  paidLeave: number;
  payableDays: number; // present + paid leave + half days ÷ 2
  earned: number;
  bonus: number;
  deductions: number;
  advances: number;
  salaryPaid: number;
  /** what is still to be paid (negative = paid too much, carried as advance) */
  balance: number;
};

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthDays(month: string): string[] {
  return Array.from({ length: daysInMonth(month) }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function payFor(input: PayInput): PaySummary {
  const all = monthDays(input.month);
  let present = 0,
    halfDays = 0,
    absent = 0,
    paidLeave = 0,
    countedDays = 0;
  for (const day of all) {
    if (input.joinedOn && day < input.joinedOn) continue;
    if (input.leftOn && day > input.leftOn) continue;
    if (day > input.today) continue;
    countedDays++;
    const status = input.attendance[day] ?? "PRESENT";
    if (status === "PRESENT") present++;
    else if (status === "HALF_DAY") halfDays++;
    else if (status === "ABSENT") absent++;
    else paidLeave++;
  }
  const payableDays = present + paidLeave + halfDays / 2;
  const earned =
    input.salaryType === "DAILY" ? Math.round(input.salary * payableDays) : Math.round((input.salary * payableDays) / all.length);

  const sum = (kind: StaffPaymentKind) => input.payments.filter((p) => p.kind === kind && !p.voided).reduce((s, p) => s + p.amount, 0);
  const bonus = sum("BONUS");
  const deductions = sum("DEDUCTION");
  const advances = sum("ADVANCE");
  const salaryPaid = sum("SALARY");

  return {
    daysInMonth: all.length,
    countedDays,
    present,
    halfDays,
    absent,
    paidLeave,
    payableDays,
    earned,
    bonus,
    deductions,
    advances,
    salaryPaid,
    balance: earned + bonus - deductions - advances - salaryPaid,
  };
}
