"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CustomerStatus } from "@/lib/customerStatus";
import type { MenuCategory } from "@/lib/menu";
import { rupees } from "@/lib/money";
import { rememberOrder } from "@/lib/myOrders";
import MenuPicker from "@/components/MenuPicker";
import OrderStatusView from "@/components/OrderStatusView";
import LangSwitch from "@/components/LangSwitch";
import { t, type Key, type Lang } from "@/lib/i18n";

type Props = {
  token: string;
  outletName: string;
  phone: string;
  customerName: string;
  pickupTime: string;
  status: CustomerStatus;
  menu: MenuCategory[];
  lang: Lang;
};

export default function TrackView(p: Props) {
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const s = p.status;
  const tr = (key: Key, vars?: Record<string, string | number>) => t(p.lang, key, vars);

  // Keep the link on this phone so the website can show "Your order" later.
  useEffect(() => rememberOrder(p.token, p.outletName, s.closed), [p.token, p.outletName, s.closed]);

  const tel = `tel:+91${p.phone.replace(/\D/g, "").slice(-10)}`;

  return (
    <div className="min-h-dvh pb-10" lang={p.lang}>
      <header className="sticky top-0 z-30 bg-ink text-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" width={36} height={36} className="size-9 rounded-full" />
          </Link>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate font-semibold">{p.outletName}</div>
            <div className="text-xs text-gold">{tr("track.subtitle")}</div>
          </div>
          <LangSwitch lang={p.lang} />
          {p.phone && (
            <a href={tel} className="rounded-lg border border-white/20 px-2.5 py-1 text-sm">
              {tr("call")}
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-4">
        {adding ? (
          <>
            <button onClick={() => setAdding(false)} className="mb-2 text-sm text-muted">
              {tr("track.back")}
            </button>
            <MenuPicker
              menu={p.menu}
              target={{ kind: "online", trackToken: p.token }}
              lang={p.lang}
              onSent={() => {
                setAdding(false);
                setMessage(tr("track.added"));
              }}
            />
          </>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              {s.tokenNo ? (
                <>
                  <div className="text-sm text-muted">{tr("track.token")}</div>
                  <div className="font-serif text-5xl font-bold">#{s.tokenNo}</div>
                </>
              ) : s.stage === -1 ? (
                <h1 className="text-xl font-bold">{tr("track.rejected")}</h1>
              ) : (
                <h1 className="text-xl font-bold">{tr("track.waiting")}</h1>
              )}
              <p className="mt-1 text-sm text-muted">
                {p.customerName}
                {p.pickupTime && ` · ${tr("track.pickup", { time: pickupLabel(p.pickupTime, tr) })}`}
              </p>
            </div>

            {message && (
              <p className="rounded-xl bg-gold-soft p-3 text-sm" role="status" onClick={() => setMessage("")}>
                {message}
              </p>
            )}

            <OrderStatusView status={s} lang={p.lang} />

            {s.stage >= 0 && s.stage < 5 && (
              <p className="text-center text-sm text-muted">{tr("track.payLater")}</p>
            )}
            {s.upi && s.due ? (
              <div className="card space-y-2 p-4 text-center">
                <a href={s.upi} className="btn-gold w-full text-base">
                  {tr("pay.upi", { amount: rupees(s.due) })}
                </a>
                <p className="text-xs text-muted">{tr("pay.upiHelpTrack")}</p>
              </div>
            ) : null}

            {!s.closed && s.stage < 6 && (
              <button onClick={() => setAdding(true)} className="btn-outline w-full">
                {tr("addMoreItems")}
              </button>
            )}
            {s.closed && (
              <Link href="/#menu" className="btn-gold w-full">
                {tr("track.again")}
              </Link>
            )}
            <p className="text-center text-xs text-muted">{tr("track.updates")}</p>
          </div>
        )}
      </main>
    </div>
  );
}

/** Pickup choices are stored in English (staff read them); show them in the customer's language. */
const PICKUP_KEYS: Record<string, Key> = {
  "As soon as possible": "pickup.asap",
  "In 30 minutes": "pickup.30",
  "In 1 hour": "pickup.60",
};
function pickupLabel(value: string, tr: (key: Key) => string): string {
  return PICKUP_KEYS[value] ? tr(PICKUP_KEYS[value]) : value;
}
