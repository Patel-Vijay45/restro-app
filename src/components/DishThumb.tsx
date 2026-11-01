import { dishIcon } from "@/lib/dishIcon";

/** Dish photo, or a food icon on a soft background when there is no photo yet. */
export default function DishThumb({
  photoId,
  name,
  category,
  size = 64,
}: {
  photoId?: string | null;
  name: string;
  category?: string;
  size?: number;
}) {
  if (photoId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/photo/${photoId}`}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        className="shrink-0 rounded-xl bg-line object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-xl bg-gold-soft"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {dishIcon(name, category)}
    </span>
  );
}
