"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-fetches the page data every few seconds so every phone sees new orders without reloading. */
export default function AutoRefresh({ seconds = 4 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
