import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import { saveStaff, setStaffActive } from "@/app/actions/manage";
import Notice from "@/components/Notice";

const ROLES = [
  { value: "WAITER", label: "Waiter: takes table orders" },
  { value: "KITCHEN", label: "Kitchen: kitchen screen only" },
  { value: "CASHIER", label: "Cashier: billing and payments" },
  { value: "MANAGER", label: "Manager: everything in this outlet" },
  { value: "OWNER", label: "Owner: everything, all outlets" },
];

export default async function StaffAdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await requireStaff(CAN_MANAGE);
  const { error } = await searchParams;
  const staff = await db.staff.findMany({
    where: me.role === "OWNER" ? {} : { outletId: me.outletId },
    include: { outlet: { select: { name: true } } },
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
  });
  const roles = me.role === "OWNER" ? ROLES : ROLES.filter((r) => ["WAITER", "KITCHEN", "CASHIER"].includes(r.value));

  return (
    <div>
      <Notice error={error} />
      <p className="mb-3 text-sm text-muted">New staff are added to the outlet you are viewing now.</p>
      <div className="mb-4 space-y-2">
        {staff.map((s) => (
          <details key={s.id} className={`card ${s.active ? "" : "opacity-60"}`}>
            <summary className="flex cursor-pointer list-none items-center justify-between p-3">
              <span>
                <span className="font-semibold">{s.name}</span>
                <span className="block text-xs text-muted">
                  {s.role.toLowerCase()} · {s.outlet?.name ?? "All outlets"}
                  {!s.active && " · turned off"}
                </span>
              </span>
              <span className="text-sm text-muted">Edit</span>
            </summary>
            <div className="border-t border-line p-3">
              <form action={saveStaff} className="space-y-3">
                <input type="hidden" name="id" value={s.id} />
                <StaffFields roles={roles} name={s.name} role={s.role} pinOptional />
                <button className="btn-primary w-full">Save</button>
              </form>
              {s.id !== me.staffId && (
                <form action={setStaffActive} className="mt-3 text-center">
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="active" value={String(!s.active)} />
                  <button className={`text-sm underline ${s.active ? "text-nonveg" : "text-veg"}`}>
                    {s.active ? "Turn off login (left the job)" : "Turn login back on"}
                  </button>
                </form>
              )}
            </div>
          </details>
        ))}
      </div>
      <form action={saveStaff} className="card space-y-3 p-4">
        <h2 className="font-bold">Add staff</h2>
        <StaffFields roles={roles} />
        <button className="btn-primary w-full">Add</button>
      </form>
    </div>
  );
}

function StaffFields({
  roles,
  name,
  role,
  pinOptional,
}: {
  roles: typeof ROLES;
  name?: string;
  role?: string;
  pinOptional?: boolean;
}) {
  return (
    <>
      <label className="block">
        <span className="label">Name</span>
        <input name="name" required defaultValue={name} className="input" />
      </label>
      <label className="block">
        <span className="label">Role</span>
        <select name="role" defaultValue={role ?? "WAITER"} className="input">
          {roles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">{pinOptional ? "New PIN (leave empty to keep)" : "PIN (4–6 digits)"}</span>
        <input name="pin" inputMode="numeric" pattern="\d{4,6}" required={!pinOptional} className="input" autoComplete="off" />
      </label>
    </>
  );
}
