"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { counterCheckout, sendToKitchen, type CartLine } from "@/app/actions/orders";
import { addToOnlineOrder, customerOrder } from "@/app/actions/customer";
import type { MenuCategory, MenuEntry } from "@/lib/menu";
import { rupees } from "@/lib/money";
import VegMark from "./VegMark";
import { t, type Key, type Lang } from "@/lib/i18n";
import ZoomThumb from "./ZoomThumb";

export type PickerTarget =
  | { kind: "order"; orderId: string }
  | { kind: "table"; tableId: string }
  | { kind: "takeaway" }
  | { kind: "counter" }
  | { kind: "customer"; token: string }
  | { kind: "online"; trackToken: string };

type Filter = "all" | "veg" | "nonveg";

export default function MenuPicker({
  menu,
  target,
  onSent,
  lang = "en",
}: {
  menu: MenuCategory[];
  target: PickerTarget;
  /** customer screens: language of the labels (staff screens are English) */
  lang?: Lang;
  /** customer page: called after the order request is sent */
  onSent?: () => void;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showCart, setShowCart] = useState(false);
  const [guests, setGuests] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const customerFacing = target.kind === "customer" || target.kind === "online";
  const tr = (key: Key, vars?: Record<string, string | number>) => t(lang, key, vars);
  const allItems = useMemo(() => new Map(menu.flatMap((c) => c.items).map((i) => [i.id, i])), [menu]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menu
      .map((c) => ({
        ...c,
        items: c.items.filter(
          (i) =>
            (filter === "all" || (filter === "veg") === i.isVeg) && (!q || i.name.toLowerCase().includes(q)),
        ),
      }))
      .filter((c) => c.items.length > 0);
  }, [menu, search, filter]);

  const lines = Object.values(cart).filter((l) => l.qty > 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + (allItems.get(l.menuItemId)?.price ?? 0) * l.qty, 0);

  function change(id: string, delta: number) {
    setCart((c) => {
      const line = c[id] ?? { menuItemId: id, qty: 0, note: "" };
      const qty = Math.max(0, Math.min(99, line.qty + delta));
      const next = { ...c, [id]: { ...line, qty } };
      if (qty === 0) delete next[id];
      return next;
    });
  }

  function setNote(id: string, note: string) {
    setCart((c) => (c[id] ? { ...c, [id]: { ...c[id], note } } : c));
  }

  function submit() {
    setError("");
    start(async () => {
      if (target.kind === "customer" || target.kind === "online") {
        const r = target.kind === "customer" ? await customerOrder(target.token, lines) : await addToOnlineOrder(target.trackToken, lines);
        if (!r.ok) return setError(r.error);
        setCart({});
        setShowCart(false);
        onSent?.();
        router.refresh();
        return;
      }
      const result =
        target.kind === "counter"
          ? await counterCheckout(lines)
          : await sendToKitchen({
              cart: lines,
              orderId: target.kind === "order" ? target.orderId : undefined,
              tableId: target.kind === "table" ? target.tableId : undefined,
              type: target.kind === "takeaway" ? "TAKEAWAY" : "DINE_IN",
              guests: guests ? parseInt(guests, 10) : undefined,
              customerName,
            });
      if (!result.ok) return setError(result.error);
      setCart({});
      router.push(target.kind === "counter" ? `/orders/${result.orderId}/bill` : `/orders/${result.orderId}`);
    });
  }

  const submitLabel =
    target.kind === "counter"
      ? `Charge ${rupees(total)}`
      : target.kind === "customer"
        ? tr("send.table", { total: rupees(total) })
        : target.kind === "online"
          ? tr("send.online", { total: rupees(total) })
          : "Send to kitchen";

  return (
    <div className="pb-24">
      <div className="sticky top-14 z-20 -mx-4 space-y-2 bg-paper px-4 pb-2 pt-1">
        <input
          className="input"
          placeholder={tr("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          type="search"
        />
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
              {f === "all" ? tr("filter.all") : f === "veg" ? tr("filter.veg") : tr("filter.nonveg")}
            </button>
          ))}
          <span className="mx-1 w-px shrink-0 bg-line" />
          {visible.map((c) => (
            <a
              key={c.id}
              href={`#cat-${c.id}`}
              className="shrink-0 rounded-full border border-line bg-white px-3 py-1.5 text-sm"
            >
              {c.name}
            </a>
          ))}
        </div>
      </div>

      {visible.length === 0 && <p className="py-10 text-center text-muted">{tr("noMatch")}</p>}

      {visible.map((c) => (
        <section key={c.id} id={`cat-${c.id}`} className="mb-4 scroll-mt-36">
          <h2 className="mb-2 mt-3 text-sm font-bold uppercase tracking-wide text-muted">{c.name}</h2>
          <div className="card divide-y divide-line">
            {c.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                photo={customerFacing}
                tr={tr}
                qty={cart[item.id]?.qty ?? 0}
                onChange={(d) => change(item.id, d)}
              />
            ))}
          </div>
        </section>
      ))}

      {count > 0 && !showCart && (
        <div className="fixed inset-x-0 bottom-16 z-30 px-4 pb-[env(safe-area-inset-bottom)]">
          <button onClick={() => setShowCart(true)} className="btn-primary mx-auto flex w-full max-w-3xl justify-between shadow-lg">
            <span>
              {count > 1 ? tr("items", { n: count }) : tr("item")} · {rupees(total)}
            </span>
            <span>{tr("review")}</span>
          </button>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={() => setShowCart(false)}>
          <div
            className="mx-auto max-h-[85dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-paper p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">{tr("review.title")}</h2>
              <button onClick={() => setShowCart(false)} className="text-sm text-muted">
                {tr("addMore")}
              </button>
            </div>
            <div className="card mb-3 divide-y divide-line">
              {lines.map((l) => {
                const item = allItems.get(l.menuItemId)!;
                return (
                  <div key={l.menuItemId} className="p-3">
                    <div className="flex items-center gap-2">
                      <VegMark veg={item.isVeg} />
                      <span className="flex-1 font-medium">{item.name}</span>
                      <Stepper qty={l.qty} onChange={(d) => change(l.menuItemId, d)} tr={tr} />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        className="input min-h-9 flex-1 text-sm"
                        placeholder={tr("note.placeholder")}
                        value={l.note}
                        onChange={(e) => setNote(l.menuItemId, e.target.value)}
                        maxLength={120}
                      />
                      <span className="w-20 text-right text-sm font-semibold">{rupees(item.price * l.qty)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {target.kind === "table" && (
              <label className="mb-3 block">
                <span className="label">Guests (optional)</span>
                <input className="input" inputMode="numeric" value={guests} onChange={(e) => setGuests(e.target.value.replace(/\D/g, ""))} />
              </label>
            )}
            {target.kind === "takeaway" && (
              <label className="mb-3 block">
                <span className="label">Customer name (optional)</span>
                <input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </label>
            )}
            {target.kind === "customer" && (
              <p className="mb-3 text-sm text-muted">{tr("send.tableHelp")}</p>
            )}
            {target.kind === "online" && (
              <p className="mb-3 text-sm text-muted">{tr("send.onlineHelp")}</p>
            )}
            {error && <p className="mb-2 text-sm text-nonveg">{error}</p>}
            <button onClick={submit} disabled={pending || count === 0} className="btn-gold w-full text-base">
              {pending ? tr("sending") : submitLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type Tr = (key: Key, vars?: Record<string, string | number>) => string;

function ItemRow({
  item,
  qty,
  photo,
  tr,
  onChange,
}: {
  item: MenuEntry;
  qty: number;
  photo?: boolean;
  tr: Tr;
  onChange: (delta: number) => void;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 ${item.isAvailable ? "" : "opacity-50"}`}>
      {photo && <ZoomThumb photoId={item.photoId} name={item.name} iconName={item.iconName} category={item.category} size={64} closeLabel={tr("close")} />}
      <VegMark veg={item.isVeg} />
      <div className="min-w-0 flex-1">
        <div className="font-medium leading-tight">{item.name}</div>
        {photo && item.description && <div className="text-xs text-muted">{item.description}</div>}
        <div className="text-sm text-muted">{rupees(item.price)}</div>
      </div>
      {!item.isAvailable ? (
        <span className="text-xs font-semibold uppercase text-nonveg">{tr("soldOut")}</span>
      ) : qty === 0 ? (
        <button onClick={() => onChange(1)} className="btn-outline min-h-9 px-5 text-sm text-veg">
          {tr("add")}
        </button>
      ) : (
        <Stepper qty={qty} onChange={onChange} tr={tr} />
      )}
    </div>
  );
}

function Stepper({ qty, onChange, tr = (k) => t("en", k) }: { qty: number; onChange: (delta: number) => void; tr?: Tr }) {
  return (
    <div className="flex items-center overflow-hidden rounded-xl border border-ink bg-ink text-white">
      <button onClick={() => onChange(-1)} className="h-9 w-9 text-lg" aria-label={tr("less")}>
        −
      </button>
      <span className="w-7 text-center font-semibold">{qty}</span>
      <button onClick={() => onChange(1)} className="h-9 w-9 text-lg" aria-label={tr("more")}>
        +
      </button>
    </div>
  );
}
