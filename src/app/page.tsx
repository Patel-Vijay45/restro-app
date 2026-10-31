import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getMenu } from "@/lib/menu";
import { baseUrl } from "@/lib/baseUrl";
import { prettyPhone, telLink, whatsappLink } from "@/lib/contact";
import WebsiteMenu from "@/components/site/WebsiteMenu";

// Reads the live menu on every visit, so prices and sold-out dishes are always current.
export const dynamic = "force-dynamic";

const DESCRIPTION =
  "DFC Family Restaurant, Gajendragad: veg & non-veg family dining. Biryani, starters, curries and more. See the menu, call, or order takeaway on WhatsApp.";

export async function generateMetadata(): Promise<Metadata> {
  const base = await baseUrl();
  return {
    title: "DFC Family Restaurant · Gajendragad | Veg & Non-Veg",
    description: DESCRIPTION,
    alternates: { canonical: base + "/" },
    openGraph: {
      title: "DFC Family Restaurant · Gajendragad",
      description: DESCRIPTION,
      url: base + "/",
      siteName: "DFC Family Restaurant",
      images: [{ url: base + "/logo.png", width: 150, height: 150 }],
      locale: "en_IN",
      type: "website",
    },
  };
}

export default async function Website() {
  const outlets = await db.outlet.findMany({ where: { showOnWebsite: true }, orderBy: { sortOrder: "asc" } });
  const menus = await Promise.all(outlets.map(async (o) => ({ outlet: o, menu: await getMenu(o.id) })));
  const main = outlets.find((o) => o.type === "RESTAURANT") ?? outlets[0];
  const base = await baseUrl();

  const jsonLd = main && {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: main.name,
    url: base + "/",
    image: base + "/logo.png",
    telephone: main.phone ? `+91${main.phone.replace(/\D/g, "").slice(-10)}` : undefined,
    address: { "@type": "PostalAddress", streetAddress: main.address, addressLocality: "Gajendragad", addressRegion: "Karnataka", addressCountry: "IN" },
    servesCuisine: ["Indian", "Biryani", "North Indian", "Chinese"],
    priceRange: "₹₹",
    hasMenu: base + "/#menu",
    acceptsReservations: false,
    hasMap: main.mapsUrl || undefined,
  };

  return (
    <div className="min-h-dvh bg-paper">
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}

      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/95 text-white backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <a href="#top" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" width={36} height={36} className="size-9 rounded-full" />
            <span className="font-serif text-lg font-bold tracking-wide text-gold">DFC</span>
          </a>
          <nav className="ml-auto flex items-center gap-4 text-sm">
            <a href="#menu" className="text-white/80 hover:text-white">
              Menu
            </a>
            <a href="#visit" className="text-white/80 hover:text-white">
              Visit
            </a>
            {main?.phone && (
              <a href={telLink(main.phone)} className="rounded-full bg-gold px-3 py-1.5 font-semibold text-ink">
                Call
              </a>
            )}
          </nav>
        </div>
      </header>

      <section id="top" className="relative overflow-hidden bg-ink text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: "radial-gradient(60% 50% at 50% 0%, rgba(201,154,46,0.35), transparent 70%)" }}
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 pb-14 pt-10 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="DFC Family Restaurant logo" width={120} height={120} className="mb-5 size-28 rounded-full shadow-[0_0_0_3px_rgba(201,154,46,0.6)]" />
          <h1 className="font-serif text-4xl font-bold leading-tight sm:text-5xl">DFC Family Restaurant</h1>
          <p className="mt-2 text-lg text-white/80">{main?.tagline || "Veg & non-veg family dining"} · Gajendragad</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
            <span className="flex items-center gap-1.5 rounded-full border border-veg/60 bg-veg/15 px-3 py-1">
              <span className="size-2 rounded-full bg-veg" /> Veg
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-nonveg/60 bg-nonveg/20 px-3 py-1">
              <span className="size-2 rounded-full bg-nonveg" /> Non-veg
            </span>
            <span className="rounded-full border border-white/20 px-3 py-1">Family dining</span>
            <span className="rounded-full border border-white/20 px-3 py-1">Takeaway</span>
          </div>
          {main?.hours && <p className="mt-4 text-sm text-gold">🕐 {main.hours}</p>}
          <div className="mt-6 grid w-full max-w-md grid-cols-3 gap-2">
            {main?.phone && (
              <a href={telLink(main.phone)} className="btn-gold">
                📞 Call
              </a>
            )}
            {main?.phone && (
              <a href={whatsappLink(main.phone, "Hello DFC Family Restaurant!")} target="_blank" rel="noopener" className="btn border border-white/25 text-white">
                WhatsApp
              </a>
            )}
            {main?.mapsUrl && (
              <a href={main.mapsUrl} target="_blank" rel="noopener" className="btn border border-white/25 text-white" aria-label="Directions on Google Maps">
                📍 Map
              </a>
            )}
          </div>
          <a href="#menu" className="mt-8 text-sm text-white/70 underline underline-offset-4">
            See the menu ↓
          </a>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-3 px-4 py-8 sm:grid-cols-3">
        <Feature icon="🍗" title="Biryani, starters & curries" text="Chicken, mutton, fish, paneer and more, cooked to order." />
        <Feature icon="🟩" title="Clear veg / non-veg marks" text="Every dish shows the green or red mark, so families can choose with ease." />
        <Feature icon="🛍️" title="Takeaway on WhatsApp" text="Pick dishes below and send the order to us on WhatsApp. Collect when ready." />
      </section>

      <section id="menu" className="mx-auto max-w-5xl scroll-mt-14 px-4 pb-10">
        <h2 className="mb-1 font-serif text-3xl font-bold">Menu</h2>
        <p className="mb-4 text-sm text-muted">Prices in ₹. Dishes marked sold out are not available today.</p>
        <WebsiteMenu
          outlets={menus.map(({ outlet, menu }) => ({ id: outlet.id, name: outlet.name, phone: outlet.phone, menu }))}
        />
      </section>

      <section id="visit" className="scroll-mt-14 bg-white py-10">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-4 font-serif text-3xl font-bold">Visit us</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {outlets.map((o) => (
              <div key={o.id} className="card p-5">
                <h3 className="text-lg font-bold">{o.name}</h3>
                {o.tagline && <p className="text-sm text-muted">{o.tagline}</p>}
                <dl className="mt-3 space-y-1.5 text-sm">
                  {o.address && <Info label="📍" value={o.address} />}
                  {o.hours && <Info label="🕐" value={o.hours} />}
                  {o.phone && <Info label="📞" value={prettyPhone(o.phone)} />}
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  {o.phone && (
                    <a href={telLink(o.phone)} className="btn-primary min-h-10 text-sm">
                      Call
                    </a>
                  )}
                  {o.phone && (
                    <a href={whatsappLink(o.phone)} target="_blank" rel="noopener" className="btn-outline min-h-10 text-sm">
                      WhatsApp
                    </a>
                  )}
                  {o.mapsUrl && (
                    <a href={o.mapsUrl} target="_blank" rel="noopener" className="btn-outline min-h-10 text-sm">
                      Directions
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          {main && (
            <iframe
              title={`Map: ${main.name}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(`${main.name}, ${main.address}`)}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="mt-6 h-72 w-full rounded-2xl border border-line"
            />
          )}
        </div>
      </section>

      <footer className="bg-ink py-8 text-center text-sm text-white/60">
        <p className="font-semibold text-white">DFC Family Restaurant · Gajendragad</p>
        {main?.phone && <p className="mt-1">{prettyPhone(main.phone)}</p>}
        <p className="mt-4">
          © {new Date().getFullYear()} DFC Family Restaurant ·{" "}
          <a href="/login" className="underline">
            Staff login
          </a>
        </p>
      </footer>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="card p-4">
      <div className="mb-1 text-2xl">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt aria-hidden>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
