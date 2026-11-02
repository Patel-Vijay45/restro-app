import type { CustomerStatus, RoundStatus } from "@/lib/customerStatus";
import { rupees } from "@/lib/money";
import VegMark from "./VegMark";
import { t, type Lang } from "@/lib/i18n";

function steps(lang: Lang, takeaway: boolean) {
  return [
    t(lang, "step.sent"),
    t(lang, "step.accepted"),
    t(lang, "step.cooking"),
    t(lang, takeaway ? "step.readyPickup" : "step.ready"),
    t(lang, takeaway ? "step.collected" : "step.served"),
    t(lang, "step.bill"),
    t(lang, "step.paid"),
  ];
}

function roundLabel(lang: Lang, status: RoundStatus, takeaway: boolean): { text: string; className: string } {
  switch (status) {
    case "PENDING":
      return { text: t(lang, "round.pending"), className: "bg-gold-soft text-ink" };
    case "REJECTED":
      return { text: t(lang, "round.rejected"), className: "bg-billed text-nonveg" };
    case "NEW":
      return { text: t(lang, "step.accepted"), className: "bg-line text-ink" };
    case "PREPARING":
      return { text: t(lang, "step.cooking"), className: "bg-busy text-ink" };
    case "READY":
      return { text: t(lang, takeaway ? "step.readyPickup" : "round.comingToYou"), className: "bg-veg text-white" };
    case "SERVED":
      return { text: t(lang, takeaway ? "step.collected" : "step.served"), className: "bg-free text-veg" };
  }
}

/** Customer's view of their order: progress steps, then each round of items with its own status, then the bill. */
export default function OrderStatusView({ status, lang = "en" }: { status: CustomerStatus; lang?: Lang }) {
  const labels = steps(lang, status.takeaway);
  const shortLabels = lang === "en";
  return (
    <div className="space-y-4">
      {status.stage >= 0 && (
        <ol className="card flex items-start justify-between gap-1 p-3" aria-label={t(lang, "status.progress")}>
          {labels.map((label, i) => {
            const done = i < status.stage;
            const current = i === status.stage;
            return (
              <li key={label} className="flex min-w-0 flex-1 flex-col items-center text-center" aria-current={current ? "step" : undefined}>
                <span
                  className={`mb-1 flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                    current ? "bg-gold text-ink ring-4 ring-gold/25" : done ? "bg-veg text-white" : "bg-line text-muted"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                {/* Kannada / Hindi step names are long: they are read out but shown once, below the row */}
                <span className={`${shortLabels ? "" : "sr-only"} text-[10px] leading-tight ${current ? "font-bold text-ink" : "text-muted"}`}>{label}</span>
              </li>
            );
          })}
        </ol>
      )}
      {status.stage >= 0 && !shortLabels && (
        <p className="-mt-2 text-center text-sm font-bold" aria-hidden>
          {labels[status.stage]}
        </p>
      )}

      {status.rounds.map((r, n) => {
        const label = roundLabel(lang, r.status, status.takeaway);
        return (
          <div key={r.id} className={`card overflow-hidden ${r.status === "PENDING" ? "border-gold" : ""}`}>
            <div className="flex items-center justify-between border-b border-line bg-paper px-3 py-2 text-sm">
              <span className="font-semibold">{n === 0 ? t(lang, "round.first") : t(lang, "round.added", { n })}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${label.className}`}>{label.text}</span>
            </div>
            <ul className="divide-y divide-line">
              {r.items.map((i, k) => (
                <li key={k} className={`flex items-center gap-2 px-3 py-2 text-sm ${r.status === "REJECTED" ? "text-muted line-through" : ""}`}>
                  <VegMark veg={i.isVeg} size={12} />
                  {i.qty} × {i.name}
                </li>
              ))}
            </ul>
            {r.status === "REJECTED" && (
              <p className="border-t border-line px-3 py-2 text-sm text-nonveg">{r.rejectReason || t(lang, "round.rejectedText")}</p>
            )}
          </div>
        );
      })}

      {(status.running > 0 || status.billTotal !== null) && (
        <div className="card flex justify-between p-4 font-bold">
          <span>{status.billTotal !== null ? t(lang, "status.billTotal") : t(lang, "status.soFar")}</span>
          <span>{rupees(status.billTotal ?? status.running)}</span>
        </div>
      )}

      {status.stage === 6 && <p className="card p-4 text-center font-semibold text-veg">{t(lang, "status.paid")}</p>}
    </div>
  );
}
