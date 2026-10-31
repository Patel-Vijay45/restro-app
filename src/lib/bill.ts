export type BillLine = { price: number; qty: number; cancelled?: boolean };

export type Discount = { kind: "none" } | { kind: "flat"; paise: number } | { kind: "percent"; percent: number };

export type BillTotals = {
  subtotal: number;
  discount: number;
  tax: number;
  roundOff: number;
  total: number;
};

/**
 * Work out a bill. All amounts are paise.
 * Tax applies only when GST is enabled for the outlet. The total is rounded to the nearest rupee.
 */
export function calculateBill(
  lines: BillLine[],
  discount: Discount,
  gst: { enabled: boolean; rateBp: number },
): BillTotals {
  const subtotal = lines.filter((l) => !l.cancelled).reduce((sum, l) => sum + l.price * l.qty, 0);

  let discountPaise = 0;
  if (discount.kind === "flat") discountPaise = discount.paise;
  if (discount.kind === "percent") discountPaise = Math.round((subtotal * discount.percent) / 100);
  discountPaise = Math.max(0, Math.min(discountPaise, subtotal));

  const taxable = subtotal - discountPaise;
  const tax = gst.enabled ? Math.round((taxable * gst.rateBp) / 10000) : 0;
  const exact = taxable + tax;
  const total = Math.round(exact / 100) * 100;

  return { subtotal, discount: discountPaise, tax, roundOff: total - exact, total };
}
