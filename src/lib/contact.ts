/** Phone helpers for the website buttons (India numbers). */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export function telLink(phone: string): string {
  return `tel:+91${phoneDigits(phone)}`;
}

export function whatsappLink(phone: string, text?: string): string {
  const base = `https://wa.me/91${phoneDigits(phone)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function prettyPhone(phone: string): string {
  const d = phoneDigits(phone);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : phone;
}
