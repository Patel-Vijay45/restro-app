// Website orders placed on this phone, kept in the browser so the website can show "Your order".
// Only a convenience: if the browser forgets, the tracking link still works.
const KEY = "dfc-my-orders";
const KEEP_MS = 24 * 60 * 60 * 1000;

export type MyOrder = { token: string; outlet: string; at: number; closed: boolean };

export function myOrders(): MyOrder[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]") as MyOrder[];
    return list.filter((o) => Date.now() - o.at < KEEP_MS);
  } catch {
    return [];
  }
}

export function rememberOrder(token: string, outlet: string, closed = false) {
  try {
    const list = myOrders().filter((o) => o.token !== token);
    const existing = myOrders().find((o) => o.token === token);
    list.unshift({ token, outlet, at: existing?.at ?? Date.now(), closed });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 5)));
  } catch {
    // private mode: ignore
  }
}
