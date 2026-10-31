"use client";

import { useState, useTransition } from "react";
import { login } from "@/app/actions/auth";

type StaffOption = { id: string; name: string; role: string; outlet: string };

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  CASHIER: "Cashier",
  WAITER: "Waiter",
  KITCHEN: "Kitchen",
};

export default function LoginForm({ staff }: { staff: StaffOption[] }) {
  const [selected, setSelected] = useState<StaffOption | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(fullPin: string) {
    if (!selected) return;
    startTransition(async () => {
      const result = await login(selected.id, fullPin);
      if (result?.error) {
        setError(result.error);
        setPin("");
      }
    });
  }

  function press(key: string) {
    setError("");
    if (key === "back") return setPin((p) => p.slice(0, -1));
    if (pin.length >= 6) return;
    setPin(pin + key);
  }

  if (!selected) {
    return (
      <div>
        <p className="mb-3 text-sm font-medium text-muted">Who are you?</p>
        <div className="grid grid-cols-2 gap-3">
          {staff.map((s) => (
            <button key={s.id} onClick={() => setSelected(s)} className="card p-4 text-left active:bg-gold-soft">
              <div className="font-semibold">{s.name}</div>
              <div className="text-xs text-muted">
                {ROLE_LABEL[s.role]} · {s.outlet}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <button onClick={() => (setSelected(null), setPin(""), setError(""))} className="mb-4 text-sm text-muted">
        ← Not {selected.name}?
      </button>
      <p className="mb-4 font-semibold">Enter PIN for {selected.name}</p>
      <div className="mb-2 flex h-6 gap-3" aria-label={`${pin.length} digits entered`}>
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <span key={i} className={`size-3.5 rounded-full ${i < pin.length ? "bg-ink" : "border-2 border-line"}`} />
        ))}
      </div>
      <p className="mb-4 h-5 text-sm text-nonveg" role="alert">
        {error}
      </p>
      <div className="grid w-full max-w-xs grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "ok"].map((key) => (
          <button
            key={key}
            disabled={pending || (key === "ok" && pin.length < 4)}
            onClick={() => (key === "ok" ? submit(pin) : press(key))}
            className={`h-16 rounded-2xl text-2xl font-semibold disabled:opacity-40 ${
              key === "ok" ? "bg-ink text-base text-white" : "border border-line bg-white active:bg-gold-soft"
            }`}
          >
            {key === "back" ? "⌫" : key === "ok" ? (pending ? "…" : "Login") : key}
          </button>
        ))}
      </div>
    </div>
  );
}
