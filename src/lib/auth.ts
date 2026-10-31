import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { SESSION_COOKIE, readSession, type SessionData } from "./session";

export type Me = SessionData;

/** Who is logged in. Sends the person to the login page if nobody is, or if their account was turned off. */
export async function requireStaff(roles?: Role[]): Promise<Me> {
  const store = await cookies();
  const session = await readSession(store.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");
  const staff = await db.staff.findUnique({ where: { id: session.staffId }, select: { active: true, role: true } });
  if (!staff?.active) redirect("/login");
  const me = { ...session, role: staff.role };
  if (roles && !roles.includes(me.role)) redirect(homeFor(me.role));
  return me;
}

export function homeFor(role: Role): string {
  if (role === "KITCHEN") return "/kitchen";
  return "/orders";
}

export const CAN_MANAGE: Role[] = ["OWNER", "MANAGER"];
export const CAN_TAKE_PAYMENT: Role[] = ["OWNER", "MANAGER", "CASHIER"];
export const CAN_ORDER: Role[] = ["OWNER", "MANAGER", "CASHIER", "WAITER"];
export const CAN_SEE_KITCHEN: Role[] = ["OWNER", "MANAGER", "KITCHEN"];
