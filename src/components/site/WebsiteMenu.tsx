"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { placeOnlineOrder } from "@/app/actions/customer";
import type { MenuCategory, MenuEntry } from "@/lib/menu";
import { rupees } from "@/lib/money";
import { rememberOrder } from "@/lib/myOrders";
import DishThumb from "@/components/DishThumb";
import VegMark from "@/components/VegMark";

type Outlet = { id: string; name: string; menu: MenuCategory[] };
type Filter = "all" | "veg" | "nonveg";

const PICKUP_CHOICES = ["As soon as possible", "In 30 minutes", "In 1 hour"];

/** Public menu with photos and takeaway ordering. Payment happens at the counter when collecting. */
export default function WebsiteMenu({ outlets }: { outlets: Outlet[] }) {
  const router = useRouter();
  const [outletId, setOutletId] = useState(outlets[0]?.id ?? "");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickup, setPickup] = useState(PICKUP_CHOICES[0]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const outlet = outlets.find((o) => o.id === outletId) ?? outlets[0];
  const items = useMemo(() => new Map((outlet?.menu ?? []).flatMap((c) => c.items).map((i) => [i.id, i])), [outlet]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (outlet?.menu ?? [])
      .map((c) => ({
        ...c,
        items: c.items.filter((i) => (filter === "all" || (filter === "veg") === i.isVeg) && (!q || i.name.toLowerCase().includes(q))),
      }))
      .filter((c) => c.items.length > 0);
  }, [outlet, filter, search]);

  if (!outlet) return <p className="text-muted">Menu coming soon.</p>;

  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ item: items.get(id), qty }))
    .filter((l): l is { item: MenuEntry; qty: number } => !!l.item && l.qty > 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const short = (n: string) => n.replace(/^DFC\s+/, "");

  function change(id: string, d: number) {
    setCart((c) => {
      const qty = Math.max(0, Math.min(20, (c[id] ?? 0) + d));
      const next = { ...c, [id]: qty };
      if (!qty) delete next[id];
      return next;
    });
  }

  function switchOutlet(id: string) {
    setOutletId(id);
    setCart({});
    setOpen(false);
  }

  function placeOrder() {
    setError("");
    start(async () => {
      const r = await placeOnlineOrder({
        outletId: outlet.id,
        cart: lines.map((l) => ({ menuItemId: l.item.id, qty: l.qty, note: "" })),
        name,
        phone,
        pickupTime: pickup,
      });
      if (!r.ok) return setError(r.error);
      rememberOrder(r.trackToken, outlet.name);
      router.push(`/track/${r.trackToken}`);
    });
  }

  return (
    <div className="pb-20">
      {outlets.length > 1 && (
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-line/60 p-1 text-sm font-semibold sm:max-w-md">
          {outlets.map((o) => (
            <button key={o.id} onClick={() => switchOutlet(o.id)} className={`rounded-lg py-2 ${o.id === outlet.id ? "bg-white shadow-sm" : "text-muted"}`}>
              {short(o.name)}
            </button>
          ))}
        </div>
      )}

      <div className="sticky top-14 z-20 -mx-4 space-y-2 bg-paper px-4 pb-2 pt-2">
        <input className="input" type="search" placeholder="Search dishes…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {(["all", "veg", "nonveg"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
                filter === f ? "border-ink bg-ink text-white" : "border-line bg-white"
              }`}
            >
              {f !== "all" && (
                <span aria-hidden>
                  <VegMark veg={f === "veg"} size={12} />
                </span>
              )}
              {f === "all" ? "All" : f === "veg" ? "Veg" : "Non-veg"}
            </button>
          ))}
          <span className="mx-1 w-px shrink-0 bg-line" />
          {visible.map((c) => (
            <a key={c.id} href={`#m-${c.id}`} className="shrink-0 rounded-full border border-line bg-white px-3 py-1.5 text-sm">
              {c.name}
            </a>
          ))}
        </div>
      </div>

      {visible.length === 0 && <p className="py-10 text-center text-muted">No dishes match.</p>}

      <div className="gap-6 sm:columns-2">
        {visible.map((c) => (
          <section key={c.id} id={`m-${c.id}`} className="mb-5 break-inside-avoid scroll-mt-40">
            <h3 className="mb-2 mt-3 font-serif text-xl font-bold">{c.name}</h3>
            <div className="card divide-y divide-line">
              {c.items.map((i) => (
                <div key={i.id} className={`flex items-center gap-3 p-3 ${i.isAvailable ? "" : "opacity-50"}`}>
                  <DishThumb photoId={i.photoId} name={i.name} category={c.name} size={72} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-1.5">
                      <span className="pt-1">
                        <VegMark veg={i.isVeg} size={12} />
                      </span>
                      <span className="font-medium leading-tight">{i.name}</span>
                    </div>
                    {i.description && <div className="text-xs text-muted">{i.description}</div>}
                    <div className="mt-0.5 text-sm font-semibold text-ink/80">{rupees(i.price)}</div>
                  </div>
                  {!i.isAvailable ? (
                    <span className="text-xs font-semibold uppercase text-nonveg">Sold out</span>
                  ) : cart[i.id] ? (
                    <div className="flex items-center overflow-hidden rounded-xl bg-ink text-white">
                      <button onClick={() => change(i.id, -1)} className="h-9 w-9 text-lg" aria-label={`Less ${i.name}`}>
                        −
                      </button>
                      <span className="w-6 text-center font-semibold">{cart[i.id]}</span>
                      <button onClick={() => change(i.id, 1)} className="h-9 w-9 text-lg" aria-label={`More ${i.name}`}>
                        +
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => change(i.id, 1)} className="btn-outline min-h-9 px-4 text-sm text-veg" aria-label={`Add ${i.name}`}>
                      ADD
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {count > 0 && !open && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button onClick={() => setOpen(true)} className="btn-primary mx-auto flex w-full max-w-md justify-between shadow-xl">
            <span>
              {count} item{count > 1 ? "s" : ""} · {rupees(total)}
            </span>
            <span>Order takeaway →</span>
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40 sm:items-center" onClick={() => setOpen(false)}>
          <div
            className="mx-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-paper p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Your takeaway order"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">Takeaway from {short(outlet.name)}</h3>
              <button onClick={() => setOpen(false)} className="text-sm text-muted">
                Add more
              </button>
            </div>
            <div className="card mb-3 divide-y divide-line">
              {lines.map((l) => (
                <div key={l.item.id} className="flex items-center gap-2 p-3 text-sm">
                  <VegMark veg={l.item.isVeg} />
                  <span className="flex-1">
                    {l.qty} × {l.item.name}
                  </span>
                  <span className="font-semibold">{rupees(l.item.price * l.qty)}</span>
                </div>
              ))}
              <div className="flex justify-between p-3 font-bold">
                <span>Total</span>
                <span>{rupees(total)}</span>
              </div>
            </div>
            <div className="mb-3 space-y-3">
              <label className="block">
                <span className="label">Your name</span>
                <input className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="block">
                <span className="label">Mobile number</span>
                <input className="input" inputMode="tel" autoComplete="tel" placeholder="10-digit number" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <label className="block">
                <span className="label">Pickup</span>
                <select className="input" value={pickup} onChange={(e) => setPickup(e.target.value)}>
                  {PICKUP_CHOICES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            {error && <p className="mb-2 rounded-xl bg-billed p-3 text-sm text-nonveg">{error}</p>}
            <button onClick={placeOrder} disabled={pending} className="btn-gold w-full text-base">
              {pending ? "Placing order…" : `Place order · ${rupees(total)}`}
            </button>
            <p className="mt-2 text-center text-xs text-muted">
              The restaurant confirms your order. You can follow it live and add more items. Pay at the counter when you collect.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
