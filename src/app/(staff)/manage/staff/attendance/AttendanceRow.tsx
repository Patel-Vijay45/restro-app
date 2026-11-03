"use client";

import { useOptimistic, useTransition } from "react";
import type { AttendanceStatus } from "@prisma/client";
import { markAttendance } from "@/app/actions/staff";
import { ATTENDANCE_LABEL } from "@/lib/staffLabels";

const ORDER: AttendanceStatus[] = ["PRESENT", "ABSENT", "HALF_DAY", "PAID_LEAVE"];

/** One person: tap P / A / ½ / L. Saves straight away. */
export default function AttendanceRow({
  staffId,
  name,
  job,
  day,
  status,
}: {
  staffId: string;
  name: string;
  job: string;
  day: string;
  status: AttendanceStatus;
}) {
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(status);
  return (
    <div className="flex items-center gap-3 p-3">
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{name}</span>
        <span className="block text-xs text-muted">
          {job} · {ATTENDANCE_LABEL[shown].text}
          {pending && " · saving…"}
        </span>
      </span>
      <div className="flex gap-1" role="radiogroup" aria-label={`Attendance for ${name}`}>
        {ORDER.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={shown === s}
            aria-label={`${name}: ${ATTENDANCE_LABEL[s].text}`}
            onClick={() =>
              start(async () => {
                setShown(s);
                await markAttendance(staffId, day, s);
              })
            }
            className={`size-10 rounded-xl border text-sm font-bold ${shown === s ? ATTENDANCE_LABEL[s].className + " ring-2 ring-ink/70" : "border-line bg-white text-muted"}`}
          >
            {ATTENDANCE_LABEL[s].short}
          </button>
        ))}
      </div>
    </div>
  );
}
