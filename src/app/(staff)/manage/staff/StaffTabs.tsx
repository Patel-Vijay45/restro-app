import Link from "next/link";

/** People / Attendance / Salary (owner only) inside Manage → Staff. */
export default function StaffTabs({ active, owner }: { active: "people" | "attendance" | "salary"; owner: boolean }) {
  const tabs = [
    { key: "people", href: "/manage/staff", label: "👥 People" },
    { key: "attendance", href: "/manage/staff/attendance", label: "🗓️ Attendance" },
    ...(owner ? [{ key: "salary", href: "/manage/staff/salary", label: "💰 Salary" }] : []),
  ];
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto [scrollbar-width:none]">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold ${
            active === t.key ? "border-ink bg-ink text-white" : "border-line bg-white"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
