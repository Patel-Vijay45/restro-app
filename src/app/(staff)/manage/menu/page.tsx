import Link from "next/link";
import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import { rupees } from "@/lib/money";
import { saveCategory } from "@/app/actions/manage";
import Notice from "@/components/Notice";
import VegMark from "@/components/VegMark";
import DishThumb from "@/components/DishThumb";
import AvailableSwitch from "./AvailableSwitch";

export default async function MenuAdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await requireStaff(CAN_MANAGE);
  const { error } = await searchParams;
  const categories = await db.category.findMany({
    where: { outletId: me.outletId, active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      items: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { _count: { select: { recipe: true } } },
      },
    },
  });
  const soldOut = categories.flatMap((c) => c.items).filter((i) => !i.isAvailable).length;
  const hasIngredients = (await db.ingredient.count({ where: { outletId: me.outletId, active: true } })) > 0;

  return (
    <div>
      <Notice error={error} />
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted">
          Tap a dish to change it or add a photo. Turn a switch off when it runs out today.{soldOut > 0 && <b className="text-nonveg"> {soldOut} sold out.</b>}
        </p>
        <div className="flex shrink-0 gap-2">
          <Link href="/manage/menu/photos" className="btn-outline min-h-9 px-3 text-sm">
            📷 Photos
          </Link>
          <Link href="/manage/menu/new" className="btn-primary min-h-9 px-3 text-sm">
            + Dish
          </Link>
        </div>
      </div>

      {categories.map((c) => (
        <section key={c.id} className="mb-5">
          <details className="mb-2">
            <summary className="cursor-pointer list-none text-sm font-bold uppercase tracking-wide text-muted">
              {c.name} <span className="font-normal normal-case">· rename / ಕನ್ನಡ / हिंदी</span>
            </summary>
            <form action={saveCategory} className="mt-2 grid grid-cols-2 gap-2">
              <input type="hidden" name="id" value={c.id} />
              <input name="name" defaultValue={c.name} className="input col-span-2" aria-label="Category name" />
              <input name="nameKn" lang="kn" defaultValue={c.nameKn} className="input" placeholder="ಕನ್ನಡ" aria-label="Category name in Kannada" />
              <input name="nameHi" lang="hi" defaultValue={c.nameHi} className="input" placeholder="हिंदी" aria-label="Category name in Hindi" />
              <button className="btn-outline col-span-2">Save</button>
            </form>
          </details>
          <div className="card divide-y divide-line">
            {c.items.length === 0 && <p className="p-3 text-sm text-muted">No dishes yet.</p>}
            {c.items.map((i) => (
              <div key={i.id} className="flex items-center gap-3 p-3">
                <DishThumb photoId={i.photoId} name={i.name} category={c.name} size={40} />
                <VegMark veg={i.isVeg} />
                <Link href={`/manage/menu/${i.id}`} className="min-w-0 flex-1">
                  <div className={`font-medium leading-tight ${i.isAvailable ? "" : "text-muted"}`}>{i.name}</div>
                  <div className="text-sm text-muted">
                    {rupees(i.price)} · edit
                    {i._count.recipe === 0 && hasIngredients && <span className="text-gold"> · no recipe</span>}
                  </div>
                </Link>
                <AvailableSwitch itemId={i.id} available={i.isAvailable} />
              </div>
            ))}
          </div>
        </section>
      ))}

      <form action={saveCategory} className="card flex gap-2 p-3">
        <input name="name" placeholder="New category (e.g. Soups)" className="input" />
        <button className="btn-outline shrink-0">Add</button>
      </form>
    </div>
  );
}
