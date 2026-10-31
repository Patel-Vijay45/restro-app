"use client";

import { useState, useTransition } from "react";
import type { KotStatus } from "@prisma/client";
import { customerCall } from "@/app/actions/customer";
import type { MenuCategory } from "@/lib/menu";
import { rupees } from "@/lib/money";
import MenuPicker from "@/components/MenuPicker";
import VegMark from "@/components/VegMark";

export type CustomerOrder = {
  items: { id: string; name: string; qty: number; isVeg: boolean; price: number; status: KotStatus }[];
  running: number;
  billTotal: number | null;
  due: number | null;
  upi: string | null;
};

const STATUS: Record<KotStatus, { label: string; className: string }> = {
  NEW: { label: "Order received", className: "bg-line text-ink" },
  PREPARING: { label: "Cooking", className: "bg-busy text-ink" },
  READY: { label: "Coming to you", className: "bg-veg text-white" },
  SERVED: { label: "Served", className: "bg-free text-veg" },
};

type Props = {
  token: string;
  outletName: string;
  tableName: string;
  phone: string;
  menu: MenuCategory[];
  order: CustomerOrder | null;
  waiting: { menuItemId: string; qty: number; name: string }[];
  calling: boolean;
  billAsked: boolean;
};

export default function CustomerView(p: Props) {
  const [tab, setTab] = useState<"menu" | "order">(p.order || p.waiting.length ? "order" : "menu");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  function call(kind: "CALL_WAITER" | "BILL") {
    start(async () => {
      const r = await customerCall(p.token, kind);
      setMessage(r.ok ? (kind === "BILL" ? "Bill requested. Your waiter is bringing it." : "Your waiter is on the way.") : r.error);
    });
  }

  const itemCount = (p.order?.items.reduce((s, i) => s + i.qty, 0) ?? 0) + p.waiting.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="min-h-dvh pb-24">
      <header className="sticky top-0 z-30 bg-ink text-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <span className="flex size-9 items-center justify-center rounded-full font-serif text-[11px] font-bold text-gold ring-1 ring-gold">DFC</span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate font-semibold">{p.outletName}</div>
            <div className="text-xs text-gold">Table {p.tableName}</div>
          </div>
          {p.phone && (
            <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="rounded-lg border border-white/20 px-2.5 py-1 text-sm">
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
        ) : (
          <OrderTab {...p} onMenu={() => setTab("menu")} />
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2">
          <button disabled={pending || p.calling} onClick={() => call("CALL_WAITER")} className="btn-outline">
            {p.calling ? "✓ Waiter called" : "🔔 Call waiter"}
          </button>
          <button disabled={pending || p.billAsked || !p.order} onClick={() => call("BILL")} className="btn-primary">
            {p.billAsked ? "✓ Bill asked" : "🧾 Ask for bill"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderTab(p: Props & { onMenu: () => void }) {
  if (!p.order && p.waiting.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="mb-2 text-4xl">🍽️</div>
        <p className="mb-4 text-muted">Nothing ordered yet.</p>
        <button onClick={p.onMenu} className="btn-gold">
          See the menu
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {p.waiting.length > 0 && (
        <div className="card border-gold p-4">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-gold" />
            </span>
            Waiting for waiter to confirm
          </div>
          <ul className="text-sm">
            {p.waiting.map((w, i) => (
              <li key={i}>
                {w.qty} × {w.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {p.order && (
        <div className="card divide-y divide-line">
          {p.order.items.map((i) => (
            <div key={i.id} className="flex items-center gap-2 p-3">
              <VegMark veg={i.isVeg} />
              <span className="flex-1">
                {i.qty} × {i.name}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[i.status].className}`}>{STATUS[i.status].label}</span>
            </div>
          ))}
          <div className="flex justify-between p-3 font-bold">
            <span>{p.order.billTotal !== null ? "Bill total" : "Total so far"}</span>
            <span>{rupees(p.order.billTotal ?? p.order.running)}</span>
          </div>
        </div>
      )}

      {p.order?.upi && p.order.due !== null && (
        <div className="card space-y-2 p-4 text-center">
          <a href={p.order.upi} className="btn-gold w-full text-base">
            Pay {rupees(p.order.due)} by UPI
          </a>
          <p className="text-xs text-muted">Opens GPay / PhonePe / Paytm. After paying, show the success screen to the cashier.</p>
        </div>
      )}
    </div>
  );
}
