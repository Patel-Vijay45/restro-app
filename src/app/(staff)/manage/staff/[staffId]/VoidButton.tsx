"use client";

import { useTransition } from "react";
import { voidStaffPayment } from "@/app/actions/staff";

export default function VoidButton({ paymentId }: { paymentId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-xs text-muted underline"
      onClick={() => {
        const reason = prompt("Why cancel this entry? (it stays in the history, crossed out)");
        if (!reason?.trim()) return;
        start(async () => {
          const r = await voidStaffPayment(paymentId, reason);
          if (!r.ok) alert(r.error);
        });
      }}
    >
      {pending ? "…" : "Cancel"}
    </button>
  );
}
