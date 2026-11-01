"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff } from "@/lib/auth";

type Result = { ok: true } | { ok: false; error: string };

const MAX_BYTES = 600 * 1024; // the phone shrinks photos to about 50–200 KB before upload
const TYPES: Record<string, (b: Buffer) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8,
  "image/png": (b) => b[0] === 0x89 && b.toString("ascii", 1, 4) === "PNG",
  "image/webp": (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
};

/** Set or replace a dish photo. The old photo is deleted (photos are not history). */
export async function uploadDishPhoto(menuItemId: string, form: FormData): Promise<Result> {
  const me = await requireStaff(CAN_MANAGE);
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a photo" };
  if (file.size > MAX_BYTES) return { ok: false, error: "Photo is too big. Try another one." };
  const data = Buffer.from(await file.arrayBuffer());
  const check = TYPES[file.type];
  if (!check || !check(data)) return { ok: false, error: "Use a JPG, PNG or WebP photo" };

  const item = await db.menuItem.findFirst({ where: { id: menuItemId, outletId: me.outletId, active: true } });
  if (!item) return { ok: false, error: "Dish not found" };
  await db.$transaction(async (tx) => {
    const photo = await tx.photo.create({ data: { mime: file.type, data } });
    await tx.menuItem.update({ where: { id: item.id }, data: { photoId: photo.id } });
    if (item.photoId) await tx.photo.delete({ where: { id: item.photoId } });
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeDishPhoto(menuItemId: string): Promise<Result> {
  const me = await requireStaff(CAN_MANAGE);
  const item = await db.menuItem.findFirst({ where: { id: menuItemId, outletId: me.outletId } });
  if (!item?.photoId) return { ok: true };
  await db.$transaction([
    db.menuItem.update({ where: { id: item.id }, data: { photoId: null } }),
    db.photo.delete({ where: { id: item.photoId } }),
  ]);
  revalidatePath("/", "layout");
  return { ok: true };
}
