import { describe, expect, it } from "vitest";
import { calculateBill } from "./bill";

const noGst = { enabled: false, rateBp: 500 };

describe("calculateBill", () => {
  it("adds up lines and skips cancelled items", () => {
    const bill = calculateBill(
      [
        { price: 18000, qty: 2 },
        { price: 4000, qty: 1 },
        { price: 9900, qty: 1, cancelled: true },
      ],
      { kind: "none" },
      noGst,
    );
    expect(bill).toEqual({ subtotal: 40000, discount: 0, tax: 0, roundOff: 0, total: 40000 });
  });

  it("applies a percent discount and rounds to the nearest rupee", () => {
    const bill = calculateBill([{ price: 33300, qty: 1 }], { kind: "percent", percent: 10 }, noGst);
    expect(bill.discount).toBe(3330);
    expect(bill.total).toBe(30000);
    expect(bill.roundOff).toBe(30);
  });

  it("never discounts more than the subtotal", () => {
    const bill = calculateBill([{ price: 5000, qty: 1 }], { kind: "flat", paise: 9000 }, noGst);
    expect(bill.discount).toBe(5000);
    expect(bill.total).toBe(0);
  });

  it("adds GST only when enabled", () => {
    const bill = calculateBill([{ price: 10000, qty: 1 }], { kind: "none" }, { enabled: true, rateBp: 500 });
    expect(bill.tax).toBe(500);
    expect(bill.total).toBe(10500);
  });
});
