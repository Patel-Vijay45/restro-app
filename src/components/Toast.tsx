"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Shows the result of a save at the top of the screen: green "✓ …" (?ok=) or red error (?error=).
 * Always visible, even when the form is far down the page. The message is removed from the address afterwards,
 * so reloading the page doesn't show it again.
 */
export default function Toast() {
  const params = useSearchParams();
  const path = usePathname();
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    const ok = params.get("ok");
    const error = params.get("error");
    if (!ok && !error) return;
    setMsg(error ? { text: error, error: true } : { text: ok!, error: false });
    const rest = new URLSearchParams(params.toString());
    rest.delete("ok");
    rest.delete("error");
    const q = rest.toString();
    window.history.replaceState(null, "", q ? `${path}?${q}` : path);
  }, [params, path]);

  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(() => setMsg(null), msg.error ? 9000 : 3500);
    return () => clearTimeout(id);
  }, [msg]);

  if (!msg) return null;
  return (
    <div className="no-print pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4">
      <button
        type="button"
        role={msg.error ? "alert" : "status"}
        onClick={() => setMsg(null)}
        className={`pointer-events-auto flex max-w-md items-start gap-2 rounded-2xl px-4 py-3 text-left text-sm font-semibold shadow-lg ${
          msg.error ? "bg-nonveg text-white" : "bg-veg text-white"
        }`}
      >
        <span aria-hidden>{msg.error ? "⚠️" : "✓"}</span>
        <span className="flex-1">{msg.text}</span>
        <span aria-hidden className="opacity-70">
          ×
        </span>
      </button>
    </div>
  );
}
