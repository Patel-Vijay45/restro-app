import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CAN_ORDER, requireStaff } from "@/lib/auth";
import { getMenu } from "@/lib/menu";
import MenuPicker from "@/components/MenuPicker";
import { orderTitle } from "@/lib/orderTitle";

export default async function AddItemsPage({ params }: { params: Promise<{ orderId: string }> }) {
  const me = await requireStaff(CAN_ORDER);
  const { orderId } = await params;
  const order = await db.order.findFirst({ where: { id: orderId, outletId: me.outletId }, include: { table: true } });
  if (!order || order.status === "PAID" || order.status === "CANCELLED") notFound();

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <Link href={`/orders/${order.id}`} className="text-2xl" aria-label="Back">
          ←
        </Link>
        <h1 className="text-xl font-bold">Add to {orderTitle(order)}</h1>
      </div>
      <MenuPicker menu={await getMenu(me.outletId)} target={{ kind: "order", orderId: order.id }} />
    </div>
  );
}
