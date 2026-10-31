import { describe, expect, it } from "vitest";
import { parseRupees, rupees } from "./money";

describe("money", () => {
  it("formats paise as rupees", () => {
    expect(rupees(12000)).toBe("₹120");
    expect(rupees(6350)).toBe("₹63.50");
    expect(rupees(12345600)).toBe("₹1,23,456");
    expect(rupees(-50)).toBe("-₹0.50");
  });

  it("parses typed rupee amounts", () => {
    expect(parseRupees("120")).toBe(12000);
    expect(parseRupees(" 99.5 ")).toBe(9950);
    expect(parseRupees("abc")).toBeNull();
    expect(parseRupees("1.234")).toBeNull();
  });
});
