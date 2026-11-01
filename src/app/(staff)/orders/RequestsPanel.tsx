"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { approveOrderRequest, closeRequest } from "@/app/actions/requests";
import type { PendingRequest } from "@/lib/requests";
import NewAlert from "@/components/NewAlert";
import VegMark from "@/components/VegMark";

const TITLE = { CALL_WAITER: "is calling you", BILL: "asked for the bill", ORDER: "wants to order" } as const;
const ICON = { CALL_WAITER: "🔔", BILL: "🧾", ORDER: "🛒" } as const;

/** Customer requests from table QR codes. Waiters confirm orders before they reach the kitchen. */
export default function RequestsPanel({ requests }: { requests: PendingRequest[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function approve(id: string) {
    start(async () => {
      const r = await approveOrderRequest(id);
      if (!r.ok) alert(r.error);
      else router.refresh();
    });
  }
  function close(id: string, status: "DONE" | "REJECTED") {
    let reason = "";
    if (status === "REJECTED") {
      const answer = prompt("Reason for the customer (optional), e.g. 'Biryani finished for today'");
      if (answer === null) return;
      reason = answer;
    }
    start(async () => {
      await closeRequest(id, status, reason);
      router.refresh();
    });
  }

  return (
    <>
      <NewAlert ids={requests.map((r) => r.id)} />
      {requests.length > 0 && (
        <section className="mb-5 space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Customer requests ({requests.length})</h2>
          {requests.map((r) => {
            const mins = Math.max(0, Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 60000));
            return (
              <div key={r.id} className="card border-gold bg-gold-soft/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  {r.customer ? (
                    <span className="font-semibold">
                      🌐 Online order{r.tokenNo ? ` · adds to token #${r.tokenNo}` : ""}
                    </span>
                  ) : (
                    <span className="font-semibold">
                      {ICON[r.kind]} {r.tableName} {TITLE[r.kind]}
                    </span>
                  )}
                  <span className="text-xs text-muted">{mins} min</span>
                </div>
                {r.customer && (
                  <div className="mb-2 text-sm">
                    <b>{r.customer.name}</b> ·{" "}
                    <a href={`tel:+91${r.customer.phone}`} className="underline">
                      {r.customer.phone}
                    </a>
                    {r.customer.pickupTime && <> · Pickup: {r.customer.pickupTime}</>}
                  </div>
                )}
                {r.kind === "ORDER" && (
                  <ul className="mb-3 space-y-1 rounded-xl bg-white p-2 text-sm">
                    {r.items.map((i, n) => (
                      <li key={n} className="flex items-start gap-2">
                        <span className="pt-0.5">
                          <VegMark veg={i.isVeg} size={12} />
                        </span>
                        <span>
                          {i.qty} × {i.name}
                          {i.note && <span className="text-muted"> · “{i.note}”</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  {r.kind === "ORDER" ? (
                    <>
                      <button disabled={pending} onClick={() => close(r.id, "REJECTED")} className="btn-outline flex-1 text-sm">
                        Reject
                      </button>
                      <button disabled={pending} onClick={() => approve(r.id)} className="btn-gold flex-[2] text-sm">
                        {r.customer ? "Accept ✓" : "Send to kitchen ✓"}
                      </button>
                    </>
                  ) : (
                    <>
                      {r.kind === "BILL" && r.orderId && (
                        <Link href={`/orders/${r.orderId}/bill`} className="btn-primary flex-1 text-sm">
                          Open bill
                        </Link>
                      )}
                      <button disabled={pending} onClick={() => close(r.id, "DONE")} className="btn-outline flex-1 text-sm">
                        Done ✓
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}
