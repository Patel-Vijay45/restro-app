import { CAN_MANAGE, requireStaff } from "@/lib/auth";

export default async function StockLayout({ children }: { children: React.ReactNode }) {
  await requireStaff(CAN_MANAGE);
  return children;
}
