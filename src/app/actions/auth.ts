"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { homeFor, requireStaff } from "@/lib/auth";
import { verifyPin } from "@/lib/pin";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

const MAX_TRIES = 5;
const LOCK_MINUTES = 5;

export async function login(staffId: string, pin: string): Promise<{ error: string } | void> {
  const staff = await db.staff.findUnique({ where: { id: staffId } });
  if (!staff || !staff.active) return { error: "Account not found" };

  if (staff.lockedUntil && staff.lockedUntil > new Date()) {
    return { error: `Too many wrong PINs. Try again in ${LOCK_MINUTES} minutes.` };
  }

  if (!verifyPin(pin, staff.pinHash)) {
    const failed = staff.failedPins + 1;
    const lock = failed >= MAX_TRIES;
    await db.staff.update({
      where: { id: staff.id },
      data: { failedPins: lock ? 0 : failed, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60000) : null },
    });
    return { error: lock ? `Too many wrong PINs. Locked for ${LOCK_MINUTES} minutes.` : "Wrong PIN" };
  }

  await db.staff.update({ where: { id: staff.id }, data: { failedPins: 0, lockedUntil: null } });

  const outletId =
    staff.outletId ?? (await db.outlet.findFirst({ orderBy: { sortOrder: "asc" }, select: { id: true } }))?.id;
  if (!outletId) return { error: "No outlet set up yet" };

  const token = await signSession({ staffId: staff.id, name: staff.name, role: staff.role, outletId });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
  redirect(homeFor(staff.role));
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

/** Owner only: switch between the restaurant and the stall. */
export async function switchOutlet(outletId: string) {
  const me = await requireStaff(["OWNER"]);
  const outlet = await db.outlet.findUnique({ where: { id: outletId } });
  if (!outlet) return;
  const token = await signSession({ ...me, outletId: outlet.id });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
  redirect("/orders");
}
