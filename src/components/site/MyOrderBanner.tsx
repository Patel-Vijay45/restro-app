"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { myOrders, type MyOrder } from "@/lib/myOrders";

/** "Your order" link on the website for orders placed from this phone in the last day. */
/** text: translated "Your order from {outlet} · Track it →" */
export default function MyOrderBanner({ text }: { text: string }) {
  const [order, setOrder] = useState<MyOrder | null>(null);
  useEffect(() => setOrder(myOrders().find((o) => !o.closed) ?? null), []);
  if (!order) return null;
  return (
    <Link href={`/track/${order.token}`} className="sticky top-14 z-20 block bg-gold px-4 py-2.5 text-center text-sm font-semibold text-ink">
      {text.replace("{outlet}", order.outlet.replace(/^DFC\s+/, ""))}
    </Link>
  );
}
