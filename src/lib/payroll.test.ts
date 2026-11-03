import { describe, expect, it } from "vitest";
import { daysInMonth, payFor, shiftMonth, type PayInput } from "./payroll";

const base: PayInput = {
  salaryType: "MONTHLY",
  salary: 15000_00,
  joinedOn: "",
  leftOn: "",
  month: "2026-10",
  today: "2026-11-03",
  attendance: {},
  payments: [],
};

describe("payroll", () => {
  it("knows month lengths and moves between months", () => {
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29);
    expect(daysInMonth("2026-10")).toBe(31);
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("pays the full monthly salary when nothing is marked", () => {
    const p = payFor(base);
    expect(p.payableDays).toBe(31);
    expect(p.earned).toBe(15000_00);
    expect(p.balance).toBe(15000_00);
  });

  it("takes off absent days and half of half days; paid leave is paid", () => {
    const p = payFor({
      ...base,
      attendance: { "2026-10-05": "ABSENT", "2026-10-06": "ABSENT", "2026-10-07": "HALF_DAY", "2026-10-08": "PAID_LEAVE" },
    });
    expect(p).toMatchObject({ present: 27, absent: 2, halfDays: 1, paidLeave: 1, payableDays: 28.5 });
    // 15,000 × 28.5 / 31 = 13,790.32
    expect(p.earned).toBe(1379032);
  });

  it("subtracts advances and salary already paid, adds bonus, subtracts deductions; voided entries don't count", () => {
    const p = payFor({
      ...base,
      payments: [
        { kind: "ADVANCE", amount: 2000_00 },
        { kind: "ADVANCE", amount: 500_00, voided: true },
        { kind: "BONUS", amount: 1000_00 },
        { kind: "DEDUCTION", amount: 300_00 },
        { kind: "SALARY", amount: 5000_00 },
      ],
    });
    expect(p.balance).toBe(15000_00 + 1000_00 - 300_00 - 2000_00 - 5000_00);
  });

  it("does not pay days before joining, after leaving, or after today", () => {
    expect(payFor({ ...base, joinedOn: "2026-10-22" }).countedDays).toBe(10);
    expect(payFor({ ...base, leftOn: "2026-10-10" }).countedDays).toBe(10);
    const current = payFor({ ...base, month: "2026-11", today: "2026-11-03" });
    expect(current.countedDays).toBe(3);
    expect(current.earned).toBe(Math.round((15000_00 * 3) / 30));
  });

  it("pays daily wage per payable day", () => {
    const p = payFor({ ...base, salaryType: "DAILY", salary: 500_00, attendance: { "2026-10-01": "ABSENT", "2026-10-02": "HALF_DAY" } });
    expect(p.payableDays).toBe(29.5);
    expect(p.earned).toBe(14750_00);
  });
});
