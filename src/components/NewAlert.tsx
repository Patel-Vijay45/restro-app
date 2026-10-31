"use client";

import { useEffect, useRef } from "react";
import { beep } from "@/lib/beep";

/** Beeps when an id appears that wasn't there on the previous refresh. */
export default function NewAlert({ ids }: { ids: string[] }) {
  const seen = useRef<Set<string> | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    const now = new Set(key ? key.split(",") : []);
    if (seen.current && [...now].some((id) => !seen.current!.has(id))) {
      beep(2);
      navigator.vibrate?.([200, 100, 200]);
    }
    seen.current = now;
  }, [key]);
  return null;
}
