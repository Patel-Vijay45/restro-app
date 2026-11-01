import type { Metadata } from "next";
import { db } from "@/lib/db";
import { CAN_MANAGE, CAN_ORDER, CAN_SEE_KITCHEN, requireStaff } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import BottomNav, { type NavLink } from "@/components/BottomNav";
import OutletSwitcher from "@/components/OutletSwitcher";
import RequestBanner from "@/components/RequestBanner";
import { lowStockCount } from "@/lib/ingredients";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DFC Staff",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "DFC Staff", statusBarStyle: "black" },
  robots: { index: false },
};

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaff();
  const outlets = await db.outlet.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });
  const outlet = outlets.find((o) => o.id === me.outletId);
  const requestIds = CAN_ORDER.includes(me.role)
    ? (await db.customerRequest.findMany({ where: { outletId: me.outletId, status: "PENDING" }, select: { id: true } })).map((r) => r.id)
    : [];

  const links: NavLink[] = [];
  if (CAN_ORDER.includes(me.role)) links.push({ href: "/orders", label: "Orders", icon: "🍽️" });
  if (CAN_SEE_KITCHEN.includes(me.role)) links.push({ href: "/kitchen", label: "Kitchen", icon: "👨‍🍳" });
  if (CAN_MANAGE.includes(me.role)) {
    links.push({ href: "/stock", label: "Stock", icon: "📦", badge: await lowStockCount(me.outletId) });
    links.push({ href: "/reports", label: "Sales", icon: "📊" });
    links.push({ href: "/manage", label: "Manage", icon: "⚙️" });
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="no-print sticky top-0 z-30 bg-ink text-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4">
          {me.role === "OWNER" ? (
            <OutletSwitcher current={me.outletId} outlets={outlets} />
          ) : (
            <span className="truncate font-semibold">{outlet?.name}</span>
          )}
          <form action={logout} className="flex items-center gap-3">
            <span className="truncate text-sm text-white/70">{me.name}</span>
            <button className="rounded-lg border border-white/20 px-2.5 py-1 text-sm">Logout</button>
          </form>
        </div>
      </header>
      <RequestBanner ids={requestIds} />
      <main className="mx-auto max-w-3xl px-4 pt-4">{children}</main>
      <BottomNav links={links} />
    </div>
  );
}
