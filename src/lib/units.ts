import type { IngredientUnit } from "@prisma/client";

// Stock is stored in thousandths of the unit ("milli"): 1 kg = 1000, so 1 milli of a KG ingredient is 1 gram.

export const UNIT_LABEL: Record<IngredientUnit, { big: string; small: string }> = {
  KG: { big: "kg", small: "g" },
  LITRE: { big: "L", small: "ml" },
  PIECE: { big: "pcs", small: "pcs" },
};

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/\.?0+$/, "");
}

/** Stock amount for people: "2.5 kg", "750 g", "1.2 L", "12 pcs". */
export function formatQty(milli: number, unit: IngredientUnit): string {
  const sign = milli < 0 ? "-" : "";
  const abs = Math.abs(milli);
  if (unit === "PIECE") return `${sign}${trim(abs / 1000)} pcs`;
  const l = UNIT_LABEL[unit];
  return abs < 1000 ? `${sign}${abs} ${l.small}` : `${sign}${trim(abs / 1000)} ${l.big}`;
}

/** Recipe amount, always in the small unit: "250 g", "30 ml", "2 pcs". */
export function formatRecipeQty(milli: number, unit: IngredientUnit): string {
  if (unit === "PIECE") return `${trim(milli / 1000)} pcs`;
  return `${milli} ${UNIT_LABEL[unit].small}`;
}

function parseNumber(input: string): number | null {
  const text = input.trim();
  if (!/^\d+(\.\d{1,3})?$/.test(text)) return null;
  return parseFloat(text);
}

/** Typed stock amount in the big unit (kg / L / pcs), e.g. "2.5" -> 2500. */
export function parseBigQty(input: string): number | null {
  const n = parseNumber(input);
  return n === null ? null : Math.round(n * 1000);
}

/** Typed recipe amount in the small unit (g / ml), or pieces for PIECE, e.g. "250" g -> 250, "0.5" pcs -> 500. */
export function parseRecipeQty(input: string, unit: IngredientUnit): number | null {
  const n = parseNumber(input);
  if (n === null) return null;
  return unit === "PIECE" ? Math.round(n * 1000) : Math.round(n);
}

/** Cost in paise of `milli` of an ingredient that costs `costPerUnit` paise per kg / L / piece. */
export function costOf(milli: number, costPerUnit: number): number {
  return Math.round((milli * costPerUnit) / 1000);
}

/** New average cost per unit after buying `qty` milli for `paid` paise. */
export function averageCost(stock: number, costPerUnit: number, qty: number, paid: number): number {
  const before = Math.max(0, stock);
  const total = before + qty;
  if (total <= 0) return costPerUnit;
  return Math.round(((before * costPerUnit) / 1000 + paid) / (total / 1000));
}
