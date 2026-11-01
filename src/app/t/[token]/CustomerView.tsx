"use client";

import { useState, useTransition } from "react";
import { customerCall } from "@/app/actions/customer";
import type { CustomerStatus } from "@/lib/customerStatus";
import type { MenuCategory } from "@/lib/menu";
import { rupees } from "@/lib/money";
import MenuPicker from "@/components/MenuPicker";
import OrderStatusView from "@/components/OrderStatusView";

type Props = {
  token: string;
  outletName: string;
  tableName: string;
  phone: string;
  menu: MenuCategory[];
  status: CustomerStatus;
  hasOrder: boolean;
  calling: boolean;
  billAsked: boolean;
};

export default function CustomerView(p: Props) {
  const [tab, setTab] = useState<"menu" | "order">(p.status.rounds.length ? "order" : "menu");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  function call(kind: "CALL_WAITER" | "BILL") {
    start(async () => {
      const r = await customerCall(p.token, kind);
      setMessage(r.ok ? (kind === "BILL" ? "Bill requested. Your waiter is bringing it." : "Your waiter is on the way.") : r.error);
    });
  }

  const itemCount = p.status.rounds.filter((r) => r.status !== "REJECTED").flatMap((r) => r.items).reduce((s, i) => s + i.qty, 0);

  return (
    <div className="min-h-dvh pb-24">
      <header className="sticky top-0 z-30 bg-ink text-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={36} height={36} className="size-9 rounded-full" />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate font-semibold">{p.outletName}</div>
            <div className="text-xs text-gold">Table {p.tableName}</div>
          </div>
          {p.phone && (
            <a href={`tel:+91${p.phone.replace(/\D/g, "").slice(-10)}`} className="rounded-lg border border-white/20 px-2.5 py-1 text-sm">
              Call
            </a>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pt-3">
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-line/60 p-1 text-sm font-semibold">
          <button onClick={() => setTab("menu")} className={`rounded-lg py-2 ${tab === "menu" ? "bg-white shadow-sm" : "text-muted"}`}>
            Menu
          </button>
          <button onClick={() => setTab("order")} className={`rounded-lg py-2 ${tab === "order" ? "bg-white shadow-sm" : "text-muted"}`}>
            My order{itemCount ? ` (${itemCount})` : ""}
          </button>
        </div>

        {message && (
          <p className="mb-3 rounded-xl bg-gold-soft p-3 text-sm" role="status" onClick={() => setMessage("")}>
            {message}
          </p>
        )}

        {tab === "menu" ? (
          <MenuPicker
            menu={p.menu}
            target={{ kind: "customer", token: p.token }}
            onSent={() => {
              setMessage("Order sent! Your waiter will confirm it in a moment.");
              setTab("order");
            }}
          />
        ) : p.status.rounds.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-2 text-4xl">🍽️</div>
            <p className="mb-4 text-muted">Nothing ordered yet.</p>
            <button onClick={() => setTab("menu")} className="btn-gold">
              See the menu
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <OrderStatusView status={p.status} />
            {p.status.upi && p.status.due ? (
              <div className="card space-y-2 p-4 text-center">
                <a href={p.status.upi} className="btn-gold w-full text-base">
                  Pay {rupees(p.status.due)} by UPI
                </a>
                <p className="text-xs text-muted">Opens GPay / PhonePe / Paytm. After paying, show the success screen to the cashier.</p>
              </div>
            ) : null}
            {p.status.stage < 6 && (
              <button onClick={() => setTab("menu")} className="btn-outline w-full">
                + Add more items
              </button>
            )}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2">
          <button disabled={pending || p.calling} onClick={() => call("CALL_WAITER")} className="btn-outline">
            {p.calling ? "✓ Waiter called" : "🔔 Call waiter"}
          </button>
          <button disabled={pending || p.billAsked || !p.hasOrder} onClick={() => call("BILL")} className="btn-primary">
            {p.billAsked ? "✓ Bill asked" : "🧾 Ask for bill"}
          </button>
        </div>
      </div>
    </div>
  );
}
