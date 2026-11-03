import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { addStaffPayment } from "@/app/actions/staff";
import { rupees } from "@/lib/money";
import { shiftMonth } from "@/lib/payroll";
import { currentMonth, monthName, payrollStaff, staffMonth, validMonth } from "@/lib/staffPay";
import { ROLE_LABEL } from "@/lib/staffLabels";
import SubmitButton from "@/components/SubmitButton";
import StaffTabs from "../StaffTabs";

/** Owner: everyone's pay for a month, with a Pay button per person. */
export default async function SalaryPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const me = await requireStaff(["OWNER"]);
  const month = validMonth((await searchParams).month);
  const staff = await payrollStaff(me.outletId, month);
  const rows = await Promise.all(staff.map(async (s) => ({ s, ...(await staffMonth(s, month)) })));
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0);
  const isCurrent = month === currentMonth();
  const back = `/manage/staff/salary?month=${month}`;

  return (
    <div>
      <StaffTabs active="salary" owner />
      <div className="mb-3 flex items-center justify-between">
        <Link href={`/manage/staff/salary?month=${shiftMonth(month, -1)}`} className="btn-outline min-h-9 px-3" aria-label="Previous month">
          ←
        </Link>
        <div className="text-center">
          <div className="font-bold">{monthName(month)}</div>
          {isCurrent && <div className="text-xs text-muted">so far, up to today</div>}
        </div>
        {month < currentMonth() ? (
          <Link href={`/manage/staff/salary?month=${shiftMonth(month, 1)}`} className="btn-outline min-h-9 px-3" aria-label="Next month">
            →
          </Link>
        ) : (
          <span className="w-11" />
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="card bg-ink p-3 text-white">
          <div className="text-xs text-gold">Still to pay</div>
          <div className="text-xl font-bold">{rupees(sum((r) => Math.max(0, r.pay.balance)))}</div>
        </div>
        <div className="card p-3">
          <div className="text-xs text-muted">Earned this month</div>
          <div className="text-xl font-bold">{rupees(sum((r) => r.pay.earned + r.pay.bonus - r.pay.deductions))}</div>
        </div>
        <div className="card p-3">
          <div className="text-xs text-muted">Advances given</div>
          <div className="text-lg font-bold">{rupees(sum((r) => r.pay.advances))}</div>
        </div>
        <div className="card p-3">
          <div className="text-xs text-muted">Salary paid</div>
          <div className="text-lg font-bold">{rupees(sum((r) => r.pay.salaryPaid))}</div>
        </div>
      </div>

      {rows.length === 0 && <p className="card p-4 text-sm text-muted">No staff with pay at this outlet for this month.</p>}

      <div className="space-y-3">
        {rows.map(({ s, pay }) => (
          <div key={s.id} className="card p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <Link href={`/manage/staff/${s.id}?month=${month}`} className="min-w-0">
                <span className="block font-semibold underline-offset-2 hover:underline">{s.name}</span>
                <span className="block text-xs text-muted">
                  {ROLE_LABEL[s.role]} · {s.salary ? `${rupees(s.salary)} ${s.salaryType === "DAILY" ? "a day" : "a month"}` : "salary not set"}
                  {!s.active && " · left"}
                </span>
              </Link>
              <span className="text-right">
                <span className={`block text-lg font-bold ${pay.balance <= 0 ? "text-veg" : ""}`}>
                  {pay.balance <= 0 ? "Paid ✓" : rupees(pay.balance)}
                </span>
                <span className="text-xs text-muted">{pay.balance <= 0 ? "" : "to pay"}</span>
              </span>
            </div>
            <div className="mb-3 text-sm text-muted">
              {pay.payableDays} of {pay.countedDays} days{pay.absent ? ` · ${pay.absent} absent` : ""}
              {pay.halfDays ? ` · ${pay.halfDays} half` : ""} · earned {rupees(pay.earned)}
              {pay.bonus ? ` · +${rupees(pay.bonus)} bonus` : ""}
              {pay.deductions ? ` · −${rupees(pay.deductions)} deducted` : ""}
              {pay.advances ? ` · −${rupees(pay.advances)} advance` : ""}
              {pay.salaryPaid ? ` · −${rupees(pay.salaryPaid)} paid` : ""}
            </div>
            {pay.balance > 0 && (
              <form action={addStaffPayment} className="flex gap-2">
                <input type="hidden" name="staffId" value={s.id} />
                <input type="hidden" name="kind" value="SALARY" />
                <input type="hidden" name="month" value={month} />
                <input type="hidden" name="back" value={back} />
                <input name="amount" inputMode="decimal" defaultValue={pay.balance / 100} className="input w-28" aria-label={`Amount for ${s.name}`} />
                <select name="mode" defaultValue="CASH" className="input w-24" aria-label="Paid by">
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK">Bank</option>
                </select>
                <SubmitButton className="btn-gold flex-1 text-sm">Pay {s.name.split(" ")[0]}</SubmitButton>
              </form>
            )}
          </div>
        ))}
      </div>
      {isCurrent && (
        <p className="mt-4 text-xs text-muted">
          The current month counts days up to today. Pay the full month after it ends, or pay part now: it is taken off the balance.
        </p>
      )}
    </div>
  );
}
