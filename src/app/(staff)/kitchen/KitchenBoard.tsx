"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { KotStatus } from "@prisma/client";
import { setKotStatus } from "@/app/actions/orders";
import VegMark from "@/components/VegMark";
import { beep } from "@/lib/beep";

type Ticket = {
  id: string;
  number: number;
  status: KotStatus;
  title: string;
  createdAt: string;
  items: { id: string; name: string; qty: number; note: string; isVeg: boolean; cancelled: boolean }[];
};

const NEXT: Partial<Record<KotStatus, { to: KotStatus; label: string; className: string }>> = {
  NEW: { to: "PREPARING", label: "Start cooking", className: "btn-gold" },
  PREPARING: { to: "READY", label: "Food ready ✓", className: "btn-primary" },
};

export default function KitchenBoard({ tickets }: { tickets: Ticket[] }) {
  const [pending, start] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState<"cook" | "ready">("cook");
  const seen = useRef<Set<string> | null>(null);

  // Beep when a new ticket arrives (not on first load).
  useEffect(() => {
    const ids = new Set(tickets.map((t) => t.id));
    if (seen.current && [...ids].some((id) => !seen.current!.has(id))) beep();
    seen.current = ids;
  }, [tickets]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const cooking = tickets.filter((t) => t.status !== "READY");
  const ready = tickets.filter((t) => t.status === "READY");
  const shown = tab === "cook" ? cooking : ready;

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-line/60 p-1 text-sm font-semibold">
        <button onClick={() => setTab("cook")} className={`rounded-lg py-2 ${tab === "cook" ? "bg-white shadow-sm" : "text-muted"}`}>
          To cook ({cooking.length})
        </button>
        <button onClick={() => setTab("ready")} className={`rounded-lg py-2 ${tab === "ready" ? "bg-white shadow-sm" : "text-muted"}`}>
          Ready, not picked up ({ready.length})
        </button>
      </div>

      {shown.length === 0 && (
        <p className="py-16 text-center text-muted">{tab === "cook" ? "No orders to cook. 👌" : "Nothing waiting for pickup."}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {shown.map((t) => {
          const mins = Math.max(0, Math.floor((now - new Date(t.createdAt).getTime()) / 60000));
          const late = mins >= 20 && t.status !== "READY";
          const next = NEXT[t.status];
          return (
            <div key={t.id} className={`card overflow-hidden ${late ? "border-nonveg ring-2 ring-nonveg/30" : ""}`}>
              <div className={`flex items-center justify-between px-3 py-2 ${t.status === "NEW" ? "bg-ink text-white" : "bg-busy"}`}>
                <span className="text-lg font-bold">{t.title}</span>
                <span className="text-sm">
                  KOT {t.number} · <span className={late ? "font-bold text-nonveg" : ""}>{mins} min</span>
                </span>
              </div>
              <ul className="divide-y divide-line">
                {t.items.map((i) => (
                  <li key={i.id} className={`flex items-start gap-2 px-3 py-2 ${i.cancelled ? "text-muted line-through" : ""}`}>
                    <span className="pt-1">
                      <VegMark veg={i.isVeg} />
                    </span>
                    <span className="w-8 text-lg font-bold">{i.qty}×</span>
                    <span className="flex-1 text-lg">
                      {i.name}
                      {i.note && <span className="block text-sm font-semibold text-nonveg">⚠ {i.note}</span>}
                      {i.cancelled && <span className="block text-xs font-semibold text-nonveg no-underline">CANCELLED</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {next && (
                <div className="border-t border-line p-2">
                  <button disabled={pending} onClick={() => start(() => setKotStatus(t.id, next.to).then(() => {}))} className={`${next.className} w-full`}>
                    {next.label}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
