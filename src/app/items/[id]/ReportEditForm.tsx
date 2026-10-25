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

/* ---------- shared styles ---------- */
const field =
  "w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 [color-scheme:dark] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30";
const labelText = "mb-1.5 block text-sm font-medium text-neutral-200";
const optionClass = "bg-neutral-900 text-white";

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
    <details className="group rounded-2xl border border-neutral-800 bg-neutral-900/60 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold text-white marker:hidden [&::-webkit-details-marker]:hidden">
        <span>✏️ Edit report</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-180"
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>

      <form action={updateReport} className="space-y-4 border-t border-neutral-800 p-5">
        <input type="hidden" name="report_id" value={reportId} />
        <input type="hidden" name="kind" value={kind} />

        <div>
          <label htmlFor="edit-title" className={labelText}>Item name</label>
          <input
            id="edit-title"
            name="title"
            defaultValue={values.title}
            required
            minLength={3}
            maxLength={100}
            className={field}
          />
        </div>

        <div>
          <label htmlFor="edit-description" className={labelText}>Description</label>
          <textarea
            id="edit-description"
            name="description"
            defaultValue={values.description}
            required
            minLength={10}
            maxLength={1000}
            rows={3}
            className={field}
          />
        </div>

        <div>
          <label htmlFor="edit-category" className={labelText}>Category</label>
          <select
            id="edit-category"
            name="category_id"
            defaultValue={values.category_id}
            required
            className={`${field} cursor-pointer`}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id} className={optionClass}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="edit-date" className={labelText}>
              {kind === "lost" ? "Last seen date (approximate)" : "Found date (approximate)"}
            </label>
            <input
              id="edit-date"
              name={dateName}
              type="date"
              defaultValue={values.date ?? ""}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="edit-location" className={labelText}>
              {kind === "lost" ? "Last seen location (approximate)" : "Found location (approximate)"}
            </label>
            <input
              id="edit-location"
              name={locationName}
              defaultValue={values.location ?? ""}
              maxLength={120}
              className={field}
            />
          </div>
        </div>

        <div>
          <label htmlFor="edit-private" className={labelText}>
            Private details <span className="font-normal text-neutral-500">(optional)</span>
          </label>
          <textarea
            id="edit-private"
            name="private_details"
            defaultValue={values.private_details}
            maxLength={1000}
            rows={2}
            placeholder="Admin-only identifying details"
            className={field}
          />
          <p className="mt-1 text-xs text-neutral-500">🔒 Only admins can see this.</p>
        </div>

        <button className="w-full cursor-pointer rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-neutral-950">
          Save changes
        </button>
      </form>
    </details>
  );
}