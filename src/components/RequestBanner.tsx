"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NewAlert from "./NewAlert";

/** Shown on every staff screen except Orders (which lists the requests itself). */
export default function RequestBanner({ ids }: { ids: string[] }) {
  const path = usePathname();
  if (path === "/orders" || ids.length === 0) return null;
  return (
    <>
      <NewAlert ids={ids} />
      <Link href="/orders" className="no-print sticky top-14 z-20 block bg-gold px-4 py-2 text-center text-sm font-semibold text-ink">
        🔔 {ids.length} customer request{ids.length > 1 ? "s" : ""} waiting · View →
      </Link>
    </>
  );
}
