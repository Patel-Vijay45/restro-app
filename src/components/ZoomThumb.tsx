"use client";

import { useState } from "react";
import DishThumb from "./DishThumb";

/** Dish thumbnail; if there is a photo, tapping it shows the photo large. */
export default function ZoomThumb(props: {
  photoId?: string | null;
  name: string;
  iconName?: string;
  category?: string;
  size?: number;
  closeLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!props.photoId) return <DishThumb {...props} />;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={props.name} className="shrink-0">
        <DishThumb {...props} />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={props.name}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4"
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/photo/${props.photoId}`} alt={props.name} className="max-h-[75dvh] w-full max-w-lg rounded-2xl object-contain" />
          <p className="mt-3 text-lg font-semibold text-white">{props.name}</p>
          <button type="button" className="mt-3 rounded-full border border-white/40 px-4 py-1.5 text-sm text-white">
            {props.closeLabel ?? "Close"}
          </button>
        </div>
      )}
    </>
  );
}
