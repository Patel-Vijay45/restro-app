export const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  CASHIER: "Cashier",
  WAITER: "Waiter",
  KITCHEN: "Kitchen",
  HELPER: "Helper (no login)",
};

export const ATTENDANCE_LABEL = {
  PRESENT: { short: "P", text: "Present", className: "bg-free text-veg border-veg/40" },
  HALF_DAY: { short: "½", text: "Half day", className: "bg-busy text-ink border-gold/60" },
  ABSENT: { short: "A", text: "Absent", className: "bg-billed text-nonveg border-nonveg/40" },
  PAID_LEAVE: { short: "L", text: "Paid leave", className: "bg-gold-soft text-ink border-gold/60" },
} as const;

export const PAYMENT_KIND_LABEL = {
  ADVANCE: "Advance",
  SALARY: "Salary paid",
  BONUS: "Bonus",
  DEDUCTION: "Deduction",
} as const;
