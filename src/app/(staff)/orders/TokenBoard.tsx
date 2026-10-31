"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { KotStatus } from "@prisma/client";
import { setKotStatus } from "@/app/actions/orders";
import { rupees } from "@/lib/money";

type Token = {
  orderId: string;
  tokenNo: number;
  paid: boolean;
  total: number;
  items: string[];
  kots: { id: string; status: KotStatus }[];
};

/** Stall: tokens waiting for food. Mark ready (call the number), then collected. */
export default function TokenBoard({ tokens }: { tokens: Token[] }) {
  const [pending, start] = useTransition();
  if (tokens.length === 0) return <p className="py-10 text-center text-muted">No tokens waiting.</p>;

  function advance(token: Token, to: KotStatus) {
    start(async () => {
      for (const k of token.kots) await setKotStatus(k.id, to);
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {tokens.map((t) => {
        const ready = t.kots.every((k) => k.status === "READY");
        return (
          <div key={t.orderId} className={`card p-4 ${ready ? "border-veg ring-2 ring-veg/30" : ""}`}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-3xl font-bold">#{t.tokenNo}</span>
              {t.paid ? (
                <span className="rounded-full bg-free px-2 py-0.5 text-xs font-semibold text-veg">Paid</span>
              ) : (
                <Link href={`/orders/${t.orderId}/bill`} className="rounded-full bg-billed px-2 py-0.5 text-xs font-semibold text-nonveg">
                  Unpaid {rupees(t.total)} →
                </Link>
              )}
            </div>
            <ul className="mb-3 text-sm">
              {t.items.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            {ready ? (
              <button disabled={pending} onClick={() => advance(t, "SERVED")} className="btn-primary w-full">
                Collected ✓
              </button>
            ) : (
              <button disabled={pending} onClick={() => advance(t, "READY")} className="btn-gold w-full">
                Food ready: call #{t.tokenNo}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
