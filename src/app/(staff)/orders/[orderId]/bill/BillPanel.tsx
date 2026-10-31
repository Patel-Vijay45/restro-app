"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { OrderStatus, PaymentMode } from "@prisma/client";
import { addPayment, generateBill, setCustomer } from "@/app/actions/orders";
import { parseRupees, rupees } from "@/lib/money";

type Props = {
  orderId: string;
  status: OrderStatus;
  isCounter: boolean;
  canDiscount: boolean;
  canTakePayment: boolean;
  hasPayments: boolean;
  due: number;
  upiQr: string | null;
  customerPhone: string;
  shareText: string;
};

export default function BillPanel(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [discountKind, setDiscountKind] = useState<"none" | "percent" | "flat">("none");
  const [discountValue, setDiscountValue] = useState("");
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<PaymentMode>("CASH");
  const [amount, setAmount] = useState((p.due / 100).toString());
  const [change, setChange] = useState<number | null>(null);
  const [phone, setPhone] = useState(p.customerPhone);

  function bill() {
    setError("");
    let discount: Parameters<typeof generateBill>[1] = { kind: "none" };
    if (discountKind === "percent") discount = { kind: "percent", percent: Number(discountValue) };
    if (discountKind === "flat") {
      const paise = parseRupees(discountValue);
      if (paise === null) return setError("Enter the discount in rupees");
      discount = { kind: "flat", paise };
    }
    start(async () => {
      const r = await generateBill(p.orderId, discount);
      if (!r.ok) return setError(r.error);
      setEditing(false);
      router.refresh();
    });
  }

  function pay() {
    setError("");
    const paise = parseRupees(amount);
    if (paise === null || paise <= 0) return setError("Enter the amount received");
    start(async () => {
      const r = await addPayment(p.orderId, mode, paise);
      if (!r.ok) return setError(r.error);
      setChange(r.change);
      router.refresh();
    });
  }

  function whatsapp() {
    const digits = phone.replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) return setError("Enter the customer's 10-digit mobile number");
    setError("");
    start(async () => {
      await setCustomer(p.orderId, "", digits);
      window.open(`https://wa.me/91${digits}?text=${encodeURIComponent(p.shareText)}`, "_blank");
    });
  }

  const showBillForm = p.status === "OPEN" || (editing && p.status === "BILLED");

  return (
    <div className="space-y-4">
      {error && <p className="rounded-xl bg-billed p-3 text-sm text-nonveg">{error}</p>}

      {showBillForm && (
        <div className="card space-y-3 p-4">
          {p.canDiscount && (
            <div>
              <span className="label">Discount</span>
              <div className="flex gap-2">
                {(["none", "percent", "flat"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => (setDiscountKind(k), setDiscountValue(""))}
                    className={`flex-1 rounded-xl border py-2 text-sm font-semibold ${discountKind === k ? "border-ink bg-ink text-white" : "border-line bg-white"}`}
                  >
                    {k === "none" ? "None" : k === "percent" ? "%" : "₹"}
                  </button>
                ))}
              </div>
              {discountKind !== "none" && (
                <input
                  className="input mt-2"
                  inputMode="decimal"
                  placeholder={discountKind === "percent" ? "e.g. 10" : "e.g. 50"}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              )}
            </div>
          )}
          <button disabled={pending} onClick={bill} className="btn-primary w-full">
            {pending ? "…" : p.status === "BILLED" ? "Update bill" : "Generate bill"}
          </button>
        </div>
      )}

      {p.status === "BILLED" && !editing && (
        <>
          {p.canTakePayment ? (
            <div className="card space-y-3 p-4">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">Take payment</span>
                <span className="text-sm text-muted">Due {rupees(p.due)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["CASH", "UPI", "CARD"] as PaymentMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`rounded-xl border py-2.5 text-sm font-semibold ${mode === m ? "border-ink bg-ink text-white" : "border-line bg-white"}`}
                  >
                    {m === "CASH" ? "💵 Cash" : m === "UPI" ? "📱 UPI" : "💳 Card"}
                  </button>
                ))}
              </div>
              {mode === "UPI" && p.upiQr && (
                <div className="flex flex-col items-center rounded-xl bg-paper p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.upiQr} alt="UPI payment QR code" className="size-52" />
                  <span className="mt-1 text-sm text-muted">Customer scans to pay {rupees(p.due)}</span>
                </div>
              )}
              {mode === "UPI" && !p.upiQr && (
                <p className="text-sm text-muted">Tip: add the UPI ID in Manage → Outlet to show a payment QR here.</p>
              )}
              <label className="block">
                <span className="label">{mode === "CASH" ? "Cash received (₹)" : "Amount (₹)"}</span>
                <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
              {mode === "CASH" && parseRupees(amount) !== null && parseRupees(amount)! > p.due && (
                <p className="text-sm font-semibold">Give back {rupees(parseRupees(amount)! - p.due)}</p>
              )}
              <button disabled={pending} onClick={pay} className="btn-gold w-full text-base">
                {pending ? "…" : `Received ${mode === "CASH" ? "cash" : mode}`}
              </button>
              {p.canDiscount && !p.hasPayments && (
                <button onClick={() => setEditing(true)} className="w-full text-sm text-muted underline">
                  Change discount
                </button>
              )}
            </div>
          ) : (
            <p className="card p-4 text-sm text-muted">Bill is ready. Ask the cashier to take the payment.</p>
          )}
        </>
      )}

      {p.status === "PAID" && (
        <div className="card p-4 text-center">
          <div className="text-3xl">✅</div>
          <div className="font-bold">Paid</div>
          {change !== null && change > 0 && <div className="mt-1 text-lg font-semibold">Give back {rupees(change)}</div>}
        </div>
      )}

      {p.status !== "OPEN" && (
        <div className="card space-y-3 p-4">
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/print/${p.orderId}`} className="btn-outline">
              🖨️ Print
            </Link>
            <button onClick={whatsapp} disabled={pending} className="btn-outline">
              WhatsApp bill
            </button>
          </div>
          <input
            className="input"
            inputMode="tel"
            placeholder="Customer mobile (for WhatsApp)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      )}

      {p.status === "PAID" && (
        <Link href="/orders" className="btn-primary w-full">
          {p.isCounter ? "Next customer →" : "Done →"}
        </Link>
      )}
    </div>
  );
}
