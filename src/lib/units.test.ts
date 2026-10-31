import { describe, expect, it } from "vitest";
import { averageCost, costOf, formatQty, formatRecipeQty, parseBigQty, parseRecipeQty } from "./units";

describe("units", () => {
  it("formats stock amounts", () => {
    expect(formatQty(2500, "KG")).toBe("2.5 kg");
    expect(formatQty(750, "KG")).toBe("750 g");
    expect(formatQty(1200, "LITRE")).toBe("1.2 L");
    expect(formatQty(12000, "PIECE")).toBe("12 pcs");
    expect(formatQty(-300, "KG")).toBe("-300 g");
  });

  it("formats recipe amounts in small units", () => {
    expect(formatRecipeQty(250, "KG")).toBe("250 g");
    expect(formatRecipeQty(1500, "LITRE")).toBe("1500 ml");
    expect(formatRecipeQty(500, "PIECE")).toBe("0.5 pcs");
  });

  it("parses typed amounts", () => {
    expect(parseBigQty("2.5")).toBe(2500);
    expect(parseBigQty("abc")).toBeNull();
    expect(parseRecipeQty("250", "KG")).toBe(250);
    expect(parseRecipeQty("2", "PIECE")).toBe(2000);
  });

  it("works out costs", () => {
    // 250 g of chicken at ₹240/kg = ₹60
    expect(costOf(250, 24000)).toBe(6000);
    // 2 kg at ₹200/kg in stock, buy 2 kg for ₹520 -> average ₹230/kg
    expect(averageCost(2000, 20000, 2000, 52000)).toBe(23000);
    // empty or negative stock: new price only
    expect(averageCost(-500, 20000, 1000, 25000)).toBe(25000);
  });
});
