import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getMenu } from "@/lib/menu";
import { customerStatus, orderInclude } from "@/lib/customerStatus";
import AutoRefresh from "@/components/AutoRefresh";
import { currentLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import TrackView from "./TrackView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your order · DFC", robots: { index: false } };

/** Customer's page for a website takeaway order. The secret code in the link is the only key. */
export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const lang = await currentLang();
  const requests = await db.customerRequest.findMany({ where: { trackToken: token }, orderBy: { createdAt: "asc" } });
  const order = await db.order.findUnique({ where: { trackToken: token }, include: orderInclude });
  const first = requests[0];

  if (!first && !order) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center p-6 text-center">
        <div className="mb-3 text-4xl">🔎</div>
        <h1 className="text-lg font-bold">{t(lang, "track.notFound")}</h1>
        <Link href="/#menu" className="btn-gold mt-4">
          {t(lang, "table.seeMenu")}
        </Link>
      </main>
    );
  }

  const outlet = order?.outlet ?? (await db.outlet.findUniqueOrThrow({ where: { id: first!.outletId } }));
  const status = await customerStatus(order, requests, true, lang);

  return (
    <>
      {!status.closed && <AutoRefresh seconds={5} />}
      <TrackView
        token={token}
        outletName={outlet.name}
        phone={outlet.phone}
        customerName={order?.customerName || first?.customerName || ""}
        pickupTime={order?.pickupTime || first?.pickupTime || ""}
        status={status}
        menu={status.closed ? [] : await getMenu(outlet.id, lang)}
        lang={lang}
      />
    </>
  );
}
