"use client";

import { useRouter } from "next/navigation";
import { LANG_COOKIE, LANGS, type Lang } from "@/lib/i18n";

/** English / ಕನ್ನಡ / हिंदी for customer screens. Remembered on this phone for a year. */
export default function LangSwitch({ lang, dark = true }: { lang: Lang; dark?: boolean }) {
  const router = useRouter();
  return (
    <select
      aria-label="Language"
      value={lang}
      onChange={(e) => {
        document.cookie = `${LANG_COOKIE}=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }}
      className={`rounded-lg px-1.5 py-1 text-sm outline-none ${dark ? "border border-white/25 bg-transparent text-white [&>option]:text-ink" : "border border-line bg-white"}`}
    >
      {LANGS.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
