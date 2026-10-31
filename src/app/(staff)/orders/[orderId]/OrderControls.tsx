"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cancelItem, cancelOrder, setKotStatus } from "@/app/actions/orders";

export function ServeButton({ kotId }: { kotId: string }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(() => setKotStatus(kotId, "SERVED").then(() => {}))} className="btn-gold w-full">
      {pending ? "…" : "Mark served ✓"}
    </button>
  );
}

export function CancelItemButton({ itemId, name }: { itemId: string; name: string }) {
  const [pending, start] = useTransition();
  function go() {
    const reason = prompt(`Why remove ${name}? (kept in the sales report)`);
    if (!reason?.trim()) return;
    start(async () => {
      const r = await cancelItem(itemId, reason);
      if (!r.ok) alert(r.error);
    });
  }
  return (
    <button disabled={pending} onClick={go} className="-mr-1 px-1 text-lg leading-none text-muted" aria-label={`Remove ${name}`}>
      ×
    </button>
  );
}

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function go() {
    const reason = prompt("Why cancel the whole order? (kept in the sales report)");
    if (!reason?.trim()) return;
    start(async () => {
      const r = await cancelOrder(orderId, reason);
      if (!r.ok) return alert(r.error);
      router.push("/orders");
    });
  }
  return (
    <button disabled={pending} onClick={go} className="text-sm font-medium text-nonveg underline">
      Cancel this order
    </button>
  );
}
