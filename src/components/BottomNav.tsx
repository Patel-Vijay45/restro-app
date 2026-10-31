"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { href: string; label: string; icon: string };

export default function BottomNav({ links }: { links: NavLink[] }) {
  const path = usePathname();
  if (links.length < 2) return null;
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-3xl">
        {links.map((l) => {
          const active = path === l.href || path.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                active ? "text-ink" : "text-muted"
              }`}
            >
              <span className={`text-xl leading-none ${active ? "" : "opacity-60 grayscale"}`} aria-hidden>
                {l.icon}
              </span>
              {l.label}
              <span className={`mt-0.5 h-0.5 w-6 rounded-full ${active ? "bg-gold" : "bg-transparent"}`} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
