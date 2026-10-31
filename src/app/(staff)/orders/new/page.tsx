import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { CAN_ORDER, requireStaff } from "@/lib/auth";
import { getMenu } from "@/lib/menu";
import MenuPicker from "@/components/MenuPicker";

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ table?: string; type?: string }> }) {
  const me = await requireStaff(CAN_ORDER);
  const { table: tableId, type } = await searchParams;

  let title = "New takeaway";
  if (tableId) {
    const table = await db.diningTable.findFirst({ where: { id: tableId, outletId: me.outletId, active: true } });
    if (!table) notFound();
    // Someone else may have opened this table meanwhile.
    const running = await db.order.findFirst({ where: { tableId, status: { in: ["OPEN", "BILLED"] } } });
    if (running) redirect(`/orders/${running.id}/add`);
    title = `Table ${table.name}`;
  } else if (type !== "takeaway") {
    redirect("/orders");
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <Link href="/orders" className="text-2xl" aria-label="Back">
          ←
        </Link>
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      <MenuPicker menu={await getMenu(me.outletId)} target={tableId ? { kind: "table", tableId } : { kind: "takeaway" }} />
    </div>
  );
}
