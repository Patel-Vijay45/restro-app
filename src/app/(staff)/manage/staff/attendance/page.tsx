import Link from "next/link";
import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/staffLabels";
import { indiaDay } from "@/lib/time";
import StaffTabs from "../StaffTabs";
import AttendanceRow from "./AttendanceRow";

function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Attendance for one day. Everyone is present unless marked otherwise. */
export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const me = await requireStaff(CAN_MANAGE);
  const today = indiaDay();
  const asked = (await searchParams).day;
  const day = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) && asked <= today ? asked : today;

  const staff = await db.staff.findMany({
    where: {
      outletId: me.outletId,
      role: { not: "OWNER" },
      ...(me.role === "OWNER" ? {} : { role: { in: ["CASHIER", "WAITER", "KITCHEN", "HELPER"] } }),
      OR: [{ joinedOn: "" }, { joinedOn: { lte: day } }],
      AND: [{ OR: [{ leftOn: "" }, { leftOn: { gte: day } }] }],
    },
    include: { attendance: { where: { day }, select: { status: true } } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  const marked = staff.filter((s) => s.attendance[0] && s.attendance[0].status !== "PRESENT").length;
  const label = new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

  return (
    <div>
      <StaffTabs active="attendance" owner={me.role === "OWNER"} />
      <div className="mb-3 flex items-center justify-between">
        <Link href={`/manage/staff/attendance?day=${shiftDay(day, -1)}`} className="btn-outline min-h-9 px-3" aria-label="Previous day">
          ←
        </Link>
        <div className="text-center">
          <div className="font-bold">{day === today ? "Today" : label}</div>
          {day === today && <div className="text-xs text-muted">{label}</div>}
        </div>
        {day < today ? (
          <Link href={`/manage/staff/attendance?day=${shiftDay(day, 1)}`} className="btn-outline min-h-9 px-3" aria-label="Next day">
            →
          </Link>
        ) : (
          <span className="w-11" />
        )}
      </div>
      <p className="mb-3 text-sm text-muted">
        Everyone counts as <b>present</b>. Tap <b>A</b> absent, <b>½</b> half day or <b>L</b> paid leave. Saved straight away.
        {marked > 0 && ` ${marked} not present.`}
      </p>
      {staff.length === 0 ? (
        <p className="card p-4 text-sm text-muted">No staff at this outlet yet. Add them in People.</p>
      ) : (
        <div className="card divide-y divide-line">
          {staff.map((s) => (
            <AttendanceRow
              key={`${s.id}-${day}`}
              staffId={s.id}
              name={s.name}
              job={ROLE_LABEL[s.role]}
              day={day}
              status={s.attendance[0]?.status ?? "PRESENT"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
