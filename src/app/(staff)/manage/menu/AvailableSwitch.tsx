"use client";

import { useOptimistic, useTransition } from "react";
import { toggleAvailable } from "@/app/actions/manage";

export default function AvailableSwitch({ itemId, available }: { itemId: string; available: boolean }) {
  const [, start] = useTransition();
  const [on, setOn] = useOptimistic(available);
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={on ? "Available" : "Sold out"}
      onClick={() =>
        start(async () => {
          setOn(!on);
          await toggleAvailable(itemId, !on);
        })
      }
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-veg" : "bg-line"}`}
    >
      <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}
