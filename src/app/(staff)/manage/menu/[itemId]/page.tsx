import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import { removeItem, saveItem } from "@/app/actions/manage";
import Notice from "@/components/Notice";
import PhotoUpload from "./PhotoUpload";

export default async function EditItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await requireStaff(CAN_MANAGE);
  const { itemId } = await params;
  const { error } = await searchParams;
  const isNew = itemId === "new";
  const item = isNew ? null : await db.menuItem.findFirst({ where: { id: itemId, outletId: me.outletId, active: true } });
  if (!isNew && !item) notFound();
  const categories = await db.category.findMany({ where: { outletId: me.outletId, active: true }, orderBy: { sortOrder: "asc" } });

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <Link href="/manage/menu" className="text-2xl" aria-label="Back">
          ←
        </Link>
        <h1 className="text-xl font-bold">{isNew ? "New dish" : `Edit ${item!.name}`}</h1>
      </div>
      <Notice error={error} />
      {item && <PhotoUpload itemId={item.id} name={item.name} photoId={item.photoId} />}
      <form action={saveItem} className="card space-y-4 p-4">
        {item && <input type="hidden" name="id" value={item.id} />}
        <label className="block">
          <span className="label">Dish name</span>
          <input name="name" required defaultValue={item?.name} className="input" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="label">Name in ಕನ್ನಡ (optional)</span>
            <input name="nameKn" lang="kn" defaultValue={item?.nameKn} className="input" placeholder="ಚಿಕನ್ ಬಿರಿಯಾನಿ" />
          </label>
          <label className="block">
            <span className="label">Name in हिंदी (optional)</span>
            <input name="nameHi" lang="hi" defaultValue={item?.nameHi} className="input" placeholder="चिकन बिरयानी" />
          </label>
        </div>
        <p className="-mt-2 text-xs text-muted">Customers who choose Kannada or Hindi see these names. Empty = English name.</p>
        <label className="block">
          <span className="label">Price (₹)</span>
          <input name="price" required inputMode="decimal" defaultValue={item ? item.price / 100 : ""} className="input" />
        </label>
        <label className="block">
          <span className="label">Category</span>
          <select name="categoryId" defaultValue={item?.categoryId} className="input">
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <span className="label">Type</span>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-line p-3 has-[:checked]:border-veg has-[:checked]:bg-free">
              <input type="radio" name="isVeg" value="veg" defaultChecked={item ? item.isVeg : true} /> Veg
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-line p-3 has-[:checked]:border-nonveg has-[:checked]:bg-billed">
              <input type="radio" name="isVeg" value="nonveg" defaultChecked={item ? !item.isVeg : false} /> Non-veg
            </label>
          </div>
        </fieldset>
        <label className="block">
          <span className="label">Description (optional, shown to customers later)</span>
          <input name="description" defaultValue={item?.description} className="input" />
        </label>
        <button className="btn-primary w-full">Save</button>
      </form>
      {item && (
        <Link href={`/manage/menu/${item.id}/recipe`} className="btn-outline mt-4 w-full">
          🧾 Recipe and cost
        </Link>
      )}
      {item && (
        <form action={removeItem} className="mt-6 text-center">
          <input type="hidden" name="id" value={item.id} />
          <button className="text-sm font-medium text-nonveg underline">Remove from menu</button>
        </form>
      )}
    </div>
  );
}
