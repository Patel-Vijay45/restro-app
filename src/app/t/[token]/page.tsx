import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getMenu } from "@/lib/menu";
import { customerStatus, orderInclude } from "@/lib/customerStatus";
import AutoRefresh from "@/components/AutoRefresh";
import CustomerView from "./CustomerView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "DFC Family Restaurant: Menu", robots: { index: false } };

/** Customer page behind each table's QR code. Public: no login. */
export default async function TablePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const table = await db.diningTable.findUnique({ where: { qrToken: token }, include: { outlet: true } });

  if (!table || !table.active) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center p-6 text-center">
        <div className="mb-3 text-4xl">🙏</div>
        <h1 className="text-lg font-bold">This QR code is not active</h1>
        <p className="text-muted">Please ask your waiter for help.</p>
      </main>
    );
  }

  const [menu, order] = await Promise.all([
    getMenu(table.outletId),
    db.order.findFirst({ where: { tableId: table.id, status: { in: ["OPEN", "BILLED"] } }, include: orderInclude }),
  ]);
  // Requests of the people at the table now: since their order started, at most the last hour.
  const since = new Date(Math.max(order?.createdAt.getTime() ?? 0, Date.now() - 60 * 60000));
  const requests = await db.customerRequest.findMany({
    where: { tableId: table.id, OR: [{ status: "PENDING" }, { kind: "ORDER", status: "REJECTED", createdAt: { gte: since } }] },
    orderBy: { createdAt: "asc" },
  });
  const status = await customerStatus(order, requests, false);
  const pending = requests.filter((r) => r.status === "PENDING");

  return (
    <>
      <AutoRefresh seconds={5} />
      <CustomerView
        token={token}
        outletName={table.outlet.name}
        tableName={table.name}
        phone={table.outlet.phone}
        menu={menu}
        status={status}
        hasOrder={!!order}
        calling={pending.some((r) => r.kind === "CALL_WAITER")}
        billAsked={pending.some((r) => r.kind === "BILL")}
      />
    </>
  );
}
