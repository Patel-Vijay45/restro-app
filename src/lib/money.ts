/** Format paise as rupees, e.g. 12050 -> "₹120.50", 12000 -> "₹120". */
export function rupees(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const whole = Math.floor(abs / 100);
  const fraction = abs % 100;
  const wholeText = whole.toLocaleString("en-IN");
  return fraction === 0
    ? `${sign}₹${wholeText}`
    : `${sign}₹${wholeText}.${String(fraction).padStart(2, "0")}`;
}

/** Parse a rupee amount typed by staff ("120", "120.5") into paise. Returns null if invalid. */
export function parseRupees(input: string): number | null {
  const text = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  return Math.round(parseFloat(text) * 100);
}
