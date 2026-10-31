const IST = "Asia/Kolkata";

/** Today's date in India as "YYYY-MM-DD". KOT and token numbers restart each day. */
export function indiaDay(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Start of today in India, as a Date (for "today's sales"). */
export function startOfIndiaDay(date = new Date()): Date {
  return new Date(`${indiaDay(date)}T00:00:00+05:30`);
}

export function timeText(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit" }).format(date);
}

export function dateTimeText(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** "5 min" style age, used on kitchen tickets. */
export function minutesSince(date: Date, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000));
}
