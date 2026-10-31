import { redirect } from "next/navigation";
import { homeFor, requireStaff } from "@/lib/auth";

export default async function Home() {
  const me = await requireStaff();
  redirect(homeFor(me.role));
}
