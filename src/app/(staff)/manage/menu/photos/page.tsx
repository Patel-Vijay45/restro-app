import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import BackHeader from "@/components/BackHeader";
import PhotoUpload from "../[itemId]/PhotoUpload";

/** Every dish with its photo, to add real photos quickly one after another. */
export default async function PhotosPage() {
  const me = await requireStaff(CAN_MANAGE);
  const categories = await db.category.findMany({
    where: { outletId: me.outletId, active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { items: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
  });
  const all = categories.flatMap((c) => c.items);
  const done = all.filter((i) => i.photoId).length;

  return (
    <div>
      <BackHeader title="Dish photos" href="/manage/menu" />
      <div className="card mb-4 p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-semibold">
            {done} of {all.length} dishes have a photo
          </span>
          <span className="text-sm text-muted">{all.length ? Math.round((done / all.length) * 100) : 0}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-veg" style={{ width: `${all.length ? (done / all.length) * 100 : 0}%` }} />
        </div>
        <p className="mt-3 text-sm text-muted">
          Tap <b>Add photo</b> and take a picture of the real dish, or pick one from the gallery. Tips: daylight, plate filling the frame,
          plain background. Photos show on the website and the table QR menu.
        </p>
      </div>
      {categories
        .filter((c) => c.items.length)
        .map((c) => (
          <section key={c.id} className="mb-5">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{c.name}</h2>
            <div className="card divide-y divide-line">
              {c.items.map((i) => (
                <PhotoUpload key={i.id} itemId={i.id} name={i.name} photoId={i.photoId} category={c.name} compact />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}
