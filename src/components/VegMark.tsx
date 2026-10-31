/** The standard Indian food mark: green square with dot = veg, red square with triangle = non-veg. */
export default function VegMark({ veg, size = 14 }: { veg: boolean; size?: number }) {
  const color = veg ? "var(--color-veg)" : "var(--color-nonveg)";
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-label={veg ? "Veg" : "Non-veg"} className="shrink-0">
      <rect x="0.75" y="0.75" width="12.5" height="12.5" rx="2" fill="white" stroke={color} strokeWidth="1.5" />
      {veg ? <circle cx="7" cy="7" r="3.2" fill={color} /> : <path d="M7 3.4 L10.6 10 H3.4 Z" fill={color} />}
    </svg>
  );
}
