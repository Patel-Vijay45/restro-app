import { rupees } from "./money";
import { dateTimeText } from "./time";

type BillInput = {
  outletName: string;
  billNo: number | null;
  title: string;
  date: Date;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  roundOff: number;
  total: number;
  footer: string;
};

/** Plain-text bill for sharing on WhatsApp. */
export function billText(b: BillInput): string {
  const lines = [
    `*${b.outletName}*`,
    `Bill #${b.billNo ?? "-"} · ${b.title}`,
    dateTimeText(b.date),
    "",
    ...b.items.map((i) => `${i.qty} × ${i.name}  ${rupees(i.price * i.qty)}`),
    "",
    `Subtotal: ${rupees(b.subtotal)}`,
  ];
  if (b.discount) lines.push(`Discount: -${rupees(b.discount)}`);
  if (b.tax) lines.push(`GST: ${rupees(b.tax)}`);
  if (b.roundOff) lines.push(`Round off: ${rupees(b.roundOff)}`);
  lines.push(`*Total: ${rupees(b.total)}*`, "", b.footer);
  return lines.join("\n");
}

export function upiLink(upiId: string, payeeName: string, amountPaise: number, note: string): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: (amountPaise / 100).toFixed(2),
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}
