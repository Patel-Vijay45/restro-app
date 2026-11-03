"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AttendanceStatus } from "@prisma/client";
import { markAttendance } from "@/app/actions/staff";
import { ATTENDANCE_LABEL } from "@/lib/staffLabels";

const ORDER: AttendanceStatus[] = ["PRESENT", "ABSENT", "HALF_DAY", "PAID_LEAVE"];
const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Month calendar: tap a day, pick Present / Absent / Half day / Paid leave. Unmarked days count as present. */
export default function AttendanceCalendar({
  staffId,
  days,
  firstWeekday,
}: {
  staffId: string;
  days: { day: string; status: AttendanceStatus | null; counted: boolean }[];
  /** 0 = Monday */
  firstWeekday: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function choose(day: string, status: AttendanceStatus) {
    setError("");
    start(async () => {
      const r = await markAttendance(staffId, day, status);
      if (!r.ok) setError(r.error ?? "Could not save");
      setOpen(null);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
        {WEEK.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <span key={`x${i}`} />
        ))}
        {days.map((d) => {
          const status = d.status ?? "PRESENT";
          const label = ATTENDANCE_LABEL[status];
          return (
            <button
              key={d.day}
              type="button"
              disabled={!d.counted || pending}
              onClick={() => setOpen(open === d.day ? null : d.day)}
              aria-label={`${d.day}: ${d.counted ? label.text : "not counted"}`}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-sm ${
                d.counted ? label.className : "border-transparent bg-paper text-muted/50"
              } ${open === d.day ? "ring-2 ring-ink" : ""}`}
            >
              <span className="font-semibold">{Number(d.day.slice(8))}</span>
              {d.counted && <span className="text-[10px] leading-none">{label.short}</span>}
            </button>
          );
        })}
      </div>
      {open && (
        <div className="mt-3 rounded-xl border border-line bg-paper p-3">
          <p className="mb-2 text-sm font-semibold">{new Date(`${open}T00:00:00`).toDateString()}</p>
          <div className="grid grid-cols-2 gap-2">
            {ORDER.map((s) => (
              <button key={s} type="button" disabled={pending} onClick={() => choose(open, s)} className={`btn border ${ATTENDANCE_LABEL[s].className}`}>
                {ATTENDANCE_LABEL[s].text}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-nonveg">{error}</p>}
      <p className="mt-2 text-xs text-muted">P present · A absent (unpaid) · ½ half day · L paid leave. Days not marked count as present.</p>
    </div>
  );
}
