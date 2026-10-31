import { redirect } from "next/navigation";
import { homeFor, requireStaff } from "@/lib/auth";

/** Staff app entry: sends each person to their main screen. */
export default async function StaffHome() {
  const me = await requireStaff();
  redirect(homeFor(me.role));
}
