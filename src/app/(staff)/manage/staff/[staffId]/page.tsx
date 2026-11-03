import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import { saveStaff, setStaffActive, addStaffPayment } from "@/app/actions/staff";
import { rupees } from "@/lib/money";
import { monthDays, shiftMonth } from "@/lib/payroll";
import { currentMonth, monthName, staffMonth, validMonth } from "@/lib/staffPay";
import { PAYMENT_KIND_LABEL, ROLE_LABEL } from "@/lib/staffLabels";
import { dateTimeText, indiaDay } from "@/lib/time";
import BackHeader from "@/components/BackHeader";
import SubmitButton from "@/components/SubmitButton";
import AttendanceCalendar from "./AttendanceCalendar";
import VoidButton from "./VoidButton";

const MANAGER_ROLES = ["CASHIER", "WAITER", "KITCHEN", "HELPER"];

export default async function StaffPage({
  params,
  searchParams,
}: {
  params: Promise<{ staffId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const me = await requireStaff(CAN_MANAGE);
  const owner = me.role === "OWNER";
  const { staffId } = await params;
  const month = validMonth((await searchParams).month);
  const isNew = staffId === "new";

  const s = isNew ? null : await db.staff.findUnique({ where: { id: staffId }, include: { outlet: { select: { name: true } } } });
  if (!isNew && (!s || (!owner && (s.outletId !== me.outletId || !MANAGER_ROLES.includes(s.role))))) notFound();

  const roles = owner ? Object.keys(ROLE_LABEL) : MANAGER_ROLES;
  const paid = s && s.role !== "OWNER";
  const data = s && paid ? await staffMonth(s, month) : null;
  const today = indiaDay();
  const firstWeekday = (new Date(`${month}-01T00:00:00Z`).getUTCDay() + 6) % 7;

  return (
    <div>
      <BackHeader title={s ? s.name : "Add staff"} href="/manage/staff" />

      {s && data && (
        <>
          <section className="card mb-4 p-4">
            <div className="mb-3 flex items-center justify-between">
              <Link href={`/manage/staff/${s.id}?month=${shiftMonth(month, -1)}`} className="btn-outline min-h-9 px-3" aria-label="Previous month">
                ←
              </Link>
              <div className="text-center">
                <div className="font-bold">{monthName(month)}</div>
                {month === currentMonth() && <div className="text-xs text-muted">so far, up to today</div>}
              </div>
              {month < currentMonth() ? (
                <Link href={`/manage/staff/${s.id}?month=${shiftMonth(month, 1)}`} className="btn-outline min-h-9 px-3" aria-label="Next month">
                  →
                </Link>
              ) : (
                <span className="w-11" />
              )}
            </div>
            <div className="mb-4 grid grid-cols-4 gap-2 text-center text-sm">
              <Stat label="Present" value={data.pay.present} />
              <Stat label="Absent" value={data.pay.absent} />
              <Stat label="Half day" value={data.pay.halfDays} />
              <Stat label="Leave" value={data.pay.paidLeave} />
            </div>
            <AttendanceCalendar
              staffId={s.id}
              firstWeekday={firstWeekday}
              days={monthDays(month).map((day) => ({
                day,
                status: data.attendance[day] ?? null,
                counted: day <= today && (!s.joinedOn || day >= s.joinedOn) && (!s.leftOn || day <= s.leftOn),
              }))}
            />
          </section>

          {owner && (
            <section className="card mb-4 p-4">
              <h2 className="mb-2 font-bold">Pay for {monthName(month)}</h2>
              {s.salary === 0 && <p className="mb-2 rounded-xl bg-gold-soft p-2 text-sm">Set the salary below to see the pay.</p>}
              <div className="space-y-1 text-sm">
                <Line
                  label={`Earned: ${data.pay.payableDays} of ${data.pay.daysInMonth} days × ${rupees(s.salary)}${s.salaryType === "DAILY" ? " a day" : " a month"}`}
                  value={rupees(data.pay.earned)}
                />
                {data.pay.bonus > 0 && <Line label="+ Bonus" value={rupees(data.pay.bonus)} />}
                {data.pay.deductions > 0 && <Line label="− Deductions" value={rupees(data.pay.deductions)} />}
                {data.pay.advances > 0 && <Line label="− Advances" value={rupees(data.pay.advances)} />}
                {data.pay.salaryPaid > 0 && <Line label="− Salary already paid" value={rupees(data.pay.salaryPaid)} />}
              </div>
              <div className="mt-2 flex justify-between border-t border-line pt-2 text-lg font-bold">
                <span>{data.pay.balance >= 0 ? "Still to pay" : "Paid extra (counts as advance)"}</span>
                <span className={data.pay.balance > 0 ? "" : "text-veg"}>{rupees(Math.abs(data.pay.balance))}</span>
              </div>

              {data.payments.length > 0 && (
                <ul className="mt-3 divide-y divide-line rounded-xl border border-line text-sm">
                  {data.payments.map((p) => (
                    <li key={p.id} className={`flex items-start justify-between gap-2 p-2.5 ${p.voided ? "text-muted line-through" : ""}`}>
                      <span>
                        <span className="font-medium">{PAYMENT_KIND_LABEL[p.kind]}</span>
                        {p.mode && ` · ${p.mode.toLowerCase()}`}
                        {p.note && ` · ${p.note}`}
                        <span className="block text-xs text-muted no-underline">
                          {dateTimeText(p.createdAt)} · {p.createdBy.name}
                          {p.voided && ` · cancelled: ${p.voidReason}`}
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        <span className="font-semibold">{rupees(p.amount)}</span>
                        {!p.voided && <VoidButton paymentId={p.id} />}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <form action={addStaffPayment} className="mt-4 space-y-2 rounded-xl bg-paper p-3">
                <input type="hidden" name="staffId" value={s.id} />
                <input type="hidden" name="month" value={month} />
                <input type="hidden" name="back" value={`/manage/staff/${s.id}?month=${month}`} />
                <div className="grid grid-cols-2 gap-2">
                  <select name="kind" className="input" aria-label="Type" defaultValue="ADVANCE">
                    <option value="ADVANCE">Advance</option>
                    <option value="SALARY">Salary paid</option>
                    <option value="BONUS">Bonus</option>
                    <option value="DEDUCTION">Deduction</option>
                  </select>
                  <input name="amount" inputMode="decimal" className="input" placeholder="Amount ₹" aria-label="Amount" />
                  <select name="mode" className="input" aria-label="Paid by" defaultValue="CASH">
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK">Bank</option>
                  </select>
                  <input name="note" className="input" placeholder="Note (optional)" aria-label="Note" />
                </div>
                <SubmitButton className="btn-gold w-full">Save</SubmitButton>
                <p className="text-xs text-muted">Bonus and deduction change what was earned; &quot;paid by&quot; is only for advance and salary.</p>
              </form>
            </section>
          )}
        </>
      )}

      <form action={saveStaff} className="card space-y-4 p-4">
        <h2 className="font-bold">{s ? "Details" : "New staff member"}</h2>
        {s && <input type="hidden" name="id" value={s.id} />}
        <label className="block">
          <span className="label">Name</span>
          <input name="name" required defaultValue={s?.name} className="input" />
        </label>
        <label className="block">
          <span className="label">Job</span>
          <select name="role" defaultValue={s?.role ?? "WAITER"} className="input">
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-muted">Helpers don&apos;t use the app: no PIN needed, only attendance and salary.</span>
        </label>
        <label className="block">
          <span className="label">{s?.pinHash ? "New PIN (leave empty to keep)" : "PIN (4–6 digits, not needed for helpers)"}</span>
          <input name="pin" inputMode="numeric" pattern="\d{4,6}" className="input" autoComplete="off" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Mobile</span>
            <input name="phone" inputMode="tel" defaultValue={s?.phone} className="input" />
          </label>
          <label className="block">
            <span className="label">Joined on</span>
            <input name="joinedOn" type="date" defaultValue={s?.joinedOn || today} className="input" />
          </label>
        </div>
        {owner && (!s || s.role !== "OWNER") && (
          <fieldset className="rounded-xl border border-line p-3">
            <legend className="px-1 text-sm font-semibold">Salary (only you can see this)</legend>
            <div className="grid grid-cols-2 gap-3">
              <select name="salaryType" defaultValue={s?.salaryType ?? "MONTHLY"} className="input" aria-label="Salary type">
                <option value="MONTHLY">Per month</option>
                <option value="DAILY">Per day</option>
              </select>
              <input name="salary" inputMode="decimal" defaultValue={s?.salary ? s.salary / 100 : ""} className="input" placeholder="₹" aria-label="Salary amount" />
            </div>
          </fieldset>
        )}
        <label className="block">
          <span className="label">Note (optional)</span>
          <input name="note" defaultValue={s?.note} className="input" placeholder="e.g. weekly off on Tuesday" />
        </label>
        <SubmitButton className="btn-primary w-full">{s ? "Save" : "Add"}</SubmitButton>
      </form>

      {s && s.id !== me.staffId && (
        <form action={setStaffActive} className="mt-5 text-center">
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="active" value={String(!s.active)} />
          <SubmitButton className={`text-sm underline ${s.active ? "text-nonveg" : "text-veg"}`}>
            {s.active ? "Mark as left (turns off the login, pay stops after today)" : "Back on the staff list"}
          </SubmitButton>
          {!s.active && s.leftOn && <p className="mt-1 text-xs text-muted">Left on {s.leftOn}</p>}
        </form>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-paper p-2">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
