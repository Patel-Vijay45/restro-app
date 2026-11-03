import { db } from "@/lib/db";
import { CAN_MANAGE, requireStaff } from "@/lib/auth";
import { saveOutlet } from "@/app/actions/manage";
import SubmitButton from "@/components/SubmitButton";

export default async function OutletAdminPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const me = await requireStaff(CAN_MANAGE);
  const { error, saved } = await searchParams;
  const o = await db.outlet.findUniqueOrThrow({ where: { id: me.outletId } });

  return (
    <div>
      <form action={saveOutlet} className="card space-y-4 p-4">
        <Field label="Name (printed on bills)" name="name" value={o.name} />
        <Field label="Address" name="address" value={o.address} />
        <Field label="Phone" name="phone" value={o.phone} />
        <Field label="UPI ID (shows a pay QR on bills)" name="upiId" value={o.upiId} placeholder="e.g. dfcrestaurant@okaxis" />
        <Field label="Bill footer" name="billFooter" value={o.billFooter} />
        <label className="block">
          <span className="label">Bill printer paper</span>
          <select name="paperWidth" defaultValue={o.paperWidth} className="input">
            <option value={80}>80 mm (wide)</option>
            <option value={58}>58 mm (small)</option>
          </select>
        </label>
        <fieldset className="rounded-xl border border-line p-3">
          <label className="flex items-center gap-2 font-medium">
            <input type="checkbox" name="gstEnabled" defaultChecked={o.gstEnabled} /> Charge GST
          </label>
          <p className="mb-2 mt-1 text-xs text-muted">Leave off unless the business is GST registered.</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="GSTIN" name="gstin" value={o.gstin} />
            <Field label="GST %" name="gstRate" value={String(o.gstRateBp / 100)} />
          </div>
        </fieldset>
        <fieldset className="space-y-3 rounded-xl border border-line p-3">
          <label className="flex items-center gap-2 font-medium">
            <input type="checkbox" name="showOnWebsite" defaultChecked={o.showOnWebsite} /> Show on the website
          </label>
          <Field label="Short line under the name" name="tagline" value={o.tagline} placeholder="e.g. Veg & non-veg family dining" />
          <Field label="Opening hours" name="hours" value={o.hours} placeholder="e.g. Every day, 11 AM – 11 PM" />
          <Field label="Google Maps link (Share → Copy link)" name="mapsUrl" value={o.mapsUrl} placeholder="https://maps.app.goo.gl/…" />
        </fieldset>
        <SubmitButton className="btn-primary w-full">Save</SubmitButton>
      </form>
    </div>
  );
}

function Field({ label, name, value, placeholder }: { label: string; name: string; value: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input name={name} defaultValue={value} placeholder={placeholder} className="input" />
    </label>
  );
}
