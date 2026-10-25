"use client";

import { useActionState, useState } from "react";
import { createReport } from "@/app/actions/items";

type Category = { id: number; name: string };

/* ---------- shared styles ---------- */
const field =
  "w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 [color-scheme:dark] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30";
const labelText = "mb-1.5 block text-sm font-medium text-neutral-200";
const hint = "mt-1 text-xs text-neutral-500";
const optionClass = "bg-neutral-900 text-white";

const types = [
  { value: "lost", label: "I lost something", sub: "Post a lost report", active: "border-rose-500/60 bg-rose-500/10 text-rose-200" },
  { value: "found", label: "I found something", sub: "Post a found notice", active: "border-emerald-500/60 bg-emerald-500/10 text-emerald-200" },
] as const;

export default function ReportForm({ categories }: { categories: Category[] }) {
  const [type, setType] = useState<"lost" | "found">("lost");
  const [fileName, setFileName] = useState<string | null>(null);
  const [state, action, pending] = useActionState(createReport, undefined);
  const locationLabel = type === "lost" ? "Last seen location (approximate)" : "Found location (approximate)";
  const dateLabel = type === "lost" ? "Last seen date (approximate)" : "Found date (approximate)";

  return (
    <form
      action={action}
      className="space-y-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 text-neutral-100 shadow-sm sm:p-6"
    >
      {/* ---------- Report type ---------- */}
      <fieldset>
        <legend className={labelText}>What would you like to report?</legend>
        <div className="grid grid-cols-2 gap-3">
          {types.map((t) => {
            const selected = type === t.value;
            return (
              <label
                key={t.value}
                className={`cursor-pointer rounded-xl border p-3 transition focus-within:ring-2 focus-within:ring-blue-500/40 ${
                  selected
                    ? t.active
                    : "border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-neutral-500"
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={t.value}
                  checked={selected}
                  onChange={() => setType(t.value)}
                  className="sr-only"
                />
                <span className="block text-sm font-semibold">{t.label}</span>
                <span className="block text-xs opacity-70">{t.sub}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* ---------- Item details ---------- */}
      <div className="space-y-4">
        <h2 className="border-b border-neutral-800 pb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Item details
        </h2>

        <div>
          <label htmlFor="title" className={labelText}>Item name</label>
          <input
            id="title"
            name="title"
            placeholder="e.g. Black wallet"
            required
            maxLength={100}
            className={field}
          />
        </div>

        <div>
          <label htmlFor="description" className={labelText}>Description</label>
          <textarea
            id="description"
            name="description"
            placeholder="Color, brand, size, anything that helps identify it"
            required
            minLength={10}
            maxLength={1000}
            rows={3}
            className={field}
          />
          <p className={hint}>At least 10 characters. This is visible to signed-in campus users.</p>
        </div>

        <div>
          <label htmlFor="category_id" className={labelText}>Category</label>
          <select id="category_id" name="category_id" required defaultValue="" className={`${field} cursor-pointer`}>
            <option value="" className={optionClass}>Choose a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id} className={optionClass}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ---------- When & where ---------- */}
      <div className="space-y-4">
        <h2 className="border-b border-neutral-800 pb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          When &amp; where
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="date" className={labelText}>{dateLabel}</label>
            <input
              id="date"
              name={type === "lost" ? "last_seen_on" : "found_at_on"}
              type="date"
              className={field}
            />
          </div>
          <div>
            <label htmlFor="location" className={labelText}>{locationLabel}</label>
            <input
              id="location"
              name={type === "lost" ? "last_seen_location" : "found_at_location"}
              maxLength={120}
              placeholder="e.g. Library, 2nd floor"
              className={field}
            />
          </div>
        </div>
      </div>

      {/* ---------- Extras ---------- */}
      <div className="space-y-4">
        <h2 className="border-b border-neutral-800 pb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Extras
        </h2>

        <div>
          <label htmlFor="private_details" className={labelText}>
            Private details <span className="font-normal text-neutral-500">(optional)</span>
          </label>
          <textarea
            id="private_details"
            name="private_details"
            placeholder="Identifying details only an admin should see, like serial numbers or contents"
            maxLength={1000}
            rows={2}
            className={field}
          />
          <p className={hint}>🔒 Only admins can see this.</p>
        </div>

        <div>
          <span className={labelText}>
            Photo <span className="font-normal text-neutral-500">(optional)</span>
          </span>
          <label
            htmlFor="image"
            className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-neutral-700 bg-neutral-950 px-4 py-6 text-center transition hover:border-blue-500/60 hover:bg-neutral-900"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-neutral-500">
              <path d="M12 16V4m0 0L8 8m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
            </svg>
            <span className="text-sm text-neutral-300">
              {fileName ?? "Click to upload a photo"}
            </span>
            <span className="text-xs text-neutral-500">JPEG, PNG or WebP. Visible to signed-in campus users.</span>
            <input
              id="image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      {/* ---------- Feedback + submit ---------- */}
      {state?.error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      {categories.length === 0 && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          No active categories are available. Contact an admin.
        </p>
      )}

      <button
        disabled={pending || categories.length === 0}
        className="w-full cursor-pointer rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Saving…" : type === "lost" ? "Submit lost report" : "Submit found notice"}
      </button>
    </form>
  );
}