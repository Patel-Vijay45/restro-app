"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { removeDishPhoto, uploadDishPhoto } from "@/app/actions/photos";
import DishThumb from "@/components/DishThumb";

const MAX_SIDE = 900;

/** Shrink a phone photo (often 3–8 MB) to about 100 KB before sending it. */
async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read the photo"))), "image/jpeg", 0.8),
  );
  return new File([blob], "dish.jpg", { type: "image/jpeg" });
}

export default function PhotoUpload({ itemId, name, photoId }: { itemId: string; name: string; photoId: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function chosen(file: File | undefined) {
    if (!file) return;
    setError("");
    start(async () => {
      try {
        const form = new FormData();
        form.append("photo", await shrink(file));
        const r = await uploadDishPhoto(itemId, form);
        if (!r.ok) setError(r.error);
        else router.refresh();
      } catch {
        setError("Could not read this photo. Try another one.");
      }
      if (input.current) input.current.value = "";
    });
  }

  return (
    <div className="card mb-4 flex items-center gap-4 p-4">
      <DishThumb photoId={photoId} name={name} size={88} />
      <div className="flex-1 space-y-2">
        <p className="text-sm text-muted">Shown on the website and the table QR menu.</p>
        <input ref={input} type="file" accept="image/*" className="hidden" aria-label="Dish photo" onChange={(e) => chosen(e.target.files?.[0])} />
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending} onClick={() => input.current?.click()} className="btn-primary min-h-10 text-sm">
            {pending ? "Uploading…" : photoId ? "📷 Change photo" : "📷 Add photo"}
          </button>
          {photoId && (
            <button
              type="button"
              disabled={pending}
              onClick={() => start(async () => (await removeDishPhoto(itemId), router.refresh()))}
              className="btn-outline min-h-10 text-sm"
            >
              Remove
            </button>
          )}
        </div>
        {error && <p className="text-sm text-nonveg">{error}</p>}
      </div>
    </div>
  );
}
