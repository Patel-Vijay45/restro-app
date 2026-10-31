type OrderLike = { type: string; tokenNo: number | null; table?: { name: string } | null; customerName?: string };

export function orderTitle(o: OrderLike): string {
  if (o.type === "DINE_IN" && o.table) return `Table ${o.table.name}`;
  if (o.type === "TAKEAWAY") return `Takeaway #${o.tokenNo}${o.customerName ? ` · ${o.customerName}` : ""}`;
  return `Token #${o.tokenNo}`;
}
