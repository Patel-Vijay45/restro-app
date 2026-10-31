export default function Notice({ error, success }: { error?: string; success?: string }) {
  if (error) return <p className="mb-3 rounded-xl bg-billed p-3 text-sm text-nonveg" role="alert">{error}</p>;
  if (success) return <p className="mb-3 rounded-xl bg-free p-3 text-sm text-veg">{success}</p>;
  return null;
}
