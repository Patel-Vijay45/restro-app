"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function PrintControls({ backHref }: { backHref: string }) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="no-print mx-auto mb-4 flex max-w-sm gap-2">
      <Link href={backHref} className="btn-outline flex-1">
        ← Back
      </Link>
      <button onClick={() => window.print()} className="btn-primary flex-1">
        Print again
      </button>
    </div>
  );
}
