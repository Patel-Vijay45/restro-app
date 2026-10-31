import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import ManageTabs from "./ManageTabs";

export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  await requireStaff(CAN_MANAGE);
  return (
    <div>
      <ManageTabs />
      {children}
    </div>
  );
}
