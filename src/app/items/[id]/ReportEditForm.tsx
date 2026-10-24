import { updateReport } from "@/app/actions/items";

type Category = { id: number; name: string };
type Values = {
  title: string;
  description: string;
  category_id: number;
  date: string | null;
  location: string | null;
  private_details: string;
};

export default function ReportEditForm({
  reportId,
  kind,
  values,
  categories,
}: {
  reportId: string;
  kind: "lost" | "found";
  values: Values;
  categories: Category[];
}) {
  const dateName = kind === "lost" ? "last_seen_on" : "found_at_on";
  const locationName = kind === "lost" ? "last_seen_location" : "found_at_location";

  return (
    <details className="mt-5 rounded border p-3">
      <summary className="cursor-pointer font-medium">Edit report</summary>
      <form action={updateReport} className="mt-3 space-y-3">
        <input type="hidden" name="report_id" value={reportId} />
        <input type="hidden" name="kind" value={kind} />
        <input name="title" defaultValue={values.title} required minLength={3} maxLength={100} className="w-full rounded border p-2" />
        <textarea name="description" defaultValue={values.description} required minLength={10} maxLength={1000} rows={3} className="w-full rounded border p-2" />
        <select name="category_id" defaultValue={values.category_id} required className="w-full rounded border p-2">
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <label className="block text-sm">
          {kind === "lost" ? "Last seen date (approximate)" : "Found date (approximate)"}
          <input name={dateName} type="date" defaultValue={values.date ?? ""} className="mt-1 w-full rounded border p-2" />
        </label>
        <label className="block text-sm">
          {kind === "lost" ? "Last seen location (approximate)" : "Found location (approximate)"}
          <input name={locationName} defaultValue={values.location ?? ""} maxLength={120} className="mt-1 w-full rounded border p-2" />
        </label>
        <textarea name="private_details" defaultValue={values.private_details} maxLength={1000} rows={2} placeholder="Admin-only identifying details" className="w-full rounded border p-2" />
        <button className="rounded bg-blue-700 px-3 py-2 text-white">Save changes</button>
      </form>
    </details>
  );
}
