import "server-only";
import { cookies } from "next/headers";
import { LANG_COOKIE, isLang, t, type Key, type Lang } from "./i18n";

/** Language the customer picked (cookie), English by default. */
export async function currentLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : "en";
}

/** Translator for server code in the customer's language. */
export async function serverT() {
  const lang = await currentLang();
  return (key: Key, vars?: Record<string, string | number>) => t(lang, key, vars);
}
