"use client";

import { useTransition } from "react";
import { switchOutlet } from "@/app/actions/auth";

export default function OutletSwitcher({
  current,
  outlets,
}: {
  current: string;
  outlets: { id: string; name: string }[];
}) {
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Outlet"
      value={current}
      disabled={pending}
      onChange={(e) => start(() => switchOutlet(e.target.value))}
      className="max-w-[60vw] truncate rounded-lg bg-ink-soft px-2 py-1 text-sm font-semibold text-white outline-none"
    >
      {outlets.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
