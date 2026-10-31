"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/manage/menu", label: "Menu" },
  { href: "/manage/tables", label: "Tables" },
  { href: "/manage/staff", label: "Staff" },
  { href: "/manage/outlet", label: "Outlet" },
];

export default function ManageTabs() {
  const path = usePathname();
  return (
    <div className="mb-4 grid grid-cols-4 gap-1 rounded-xl bg-line/60 p-1 text-sm font-semibold">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`rounded-lg py-2 text-center ${path.startsWith(t.href) ? "bg-white shadow-sm" : "text-muted"}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
