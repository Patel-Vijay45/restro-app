import { db } from "@/lib/db";
import { CAN_SEE_KITCHEN, requireStaff } from "@/lib/auth";
import { orderTitle } from "@/lib/orderTitle";
import AutoRefresh from "@/components/AutoRefresh";
import KitchenBoard from "./KitchenBoard";

export default async function KitchenPage() {
  const me = await requireStaff(CAN_SEE_KITCHEN);
  const kots = await db.kot.findMany({
    where: {
      outletId: me.outletId,
      status: { in: ["NEW", "PREPARING", "READY"] },
      order: { status: { not: "CANCELLED" } },
    },
    include: { order: { include: { table: true } }, items: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <AutoRefresh seconds={3} />
      <KitchenBoard
        tickets={kots.map((k) => ({
          id: k.id,
          number: k.number,
          status: k.status,
          title: orderTitle(k.order),
          createdAt: k.createdAt.toISOString(),
          items: k.items.map((i) => ({ id: i.id, name: i.name, qty: i.qty, note: i.note, isVeg: i.isVeg, cancelled: i.cancelled })),
        }))}
      />
    </div>
  );
}
