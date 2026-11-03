import Link from "next/link";
import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import { rupees } from "@/lib/money";
import { indiaDay } from "@/lib/time";
import StaffTabs from "./StaffTabs";
import { ROLE_LABEL } from "@/lib/staffLabels";


const TODAY_LABEL: Record<string, { text: string; className: string }> = {
  ABSENT: { text: "Absent today", className: "bg-billed text-nonveg" },
  HALF_DAY: { text: "Half day today", className: "bg-busy" },
  PAID_LEAVE: { text: "On leave today", className: "bg-gold-soft" },
};

export default async function StaffListPage() {
  const me = await requireStaff(CAN_MANAGE);
  const owner = me.role === "OWNER";
  const staff = await db.staff.findMany({
    where: owner ? {} : { outletId: me.outletId },
    include: {
      outlet: { select: { name: true } },
      attendance: { where: { day: indiaDay() }, select: { status: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  const active = staff.filter((s) => s.active);
  const left = staff.filter((s) => !s.active);

  const Row = ({ s }: { s: (typeof staff)[number] }) => {
    const today = s.attendance[0]?.status;
    const badge = today && TODAY_LABEL[today];
    return (
      <Link href={`/manage/staff/${s.id}`} className="flex items-center gap-3 p-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft font-bold">{s.name.slice(0, 1)}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{s.name}</span>
          <span className="block text-xs text-muted">
            {ROLE_LABEL[s.role]} · {s.outlet?.name ?? "All outlets"}
            {s.phone && ` · ${s.phone}`}
          </span>
          {badge && <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>{badge.text}</span>}
        </span>
        {owner && s.role !== "OWNER" && (
          <span className="text-right text-sm">
            {s.salary ? rupees(s.salary) : <span className="text-gold">set pay</span>}
            <span className="block text-xs text-muted">{s.salary ? (s.salaryType === "DAILY" ? "per day" : "per month") : ""}</span>
          </span>
        )}
        <span className="text-muted">›</span>
      </Link>
    );
  };

  return (
    <div>
      <StaffTabs active="people" owner={owner} />
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted">{active.length} people working</p>
        <Link href="/manage/staff/new" className="btn-primary min-h-9 text-sm">
          + Add staff
        </Link>
      </div>
      <div className="card mb-5 divide-y divide-line">
        {active.map((s) => (
          <Row key={s.id} s={s} />
        ))}
      </div>
      {left.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Left / turned off ({left.length})</h2>
          <div className="card divide-y divide-line opacity-70">
            {left.map((s) => (
              <Row key={s.id} s={s} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
