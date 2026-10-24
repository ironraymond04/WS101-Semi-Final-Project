"use client";

import { useActionState, useState } from "react";
import { createReport } from "@/app/actions/items";

type Category = { id: number; name: string };

export default function ReportForm({ categories }: { categories: Category[] }) {
  const [type, setType] = useState<"lost" | "found">("lost");
  const [state, action, pending] = useActionState(createReport, undefined);
  const locationLabel = type === "lost" ? "Last seen location (approximate)" : "Found location (approximate)";
  const dateLabel = type === "lost" ? "Last seen date (approximate)" : "Found date (approximate)";

  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm font-medium">
        Report type
        <select name="type" value={type} onChange={(event) => setType(event.target.value as "lost" | "found")} className="mt-1 w-full rounded border p-2">
          <option value="lost">I lost something</option>
          <option value="found">I found something</option>
        </select>
      </label>
      <input name="title" placeholder="Item name (e.g. Black wallet)" required maxLength={100} className="w-full rounded border p-2" />
      <textarea name="description" placeholder="Useful description (at least 10 characters)" required minLength={10} maxLength={1000} rows={3} className="w-full rounded border p-2" />
      <select name="category_id" required className="w-full rounded border p-2">
        <option value="">Choose a category</option>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select>
      <label className="block text-sm font-medium">
        {dateLabel}
        <input name={type === "lost" ? "last_seen_on" : "found_at_on"} type="date" className="mt-1 w-full rounded border p-2" />
      </label>
      <label className="block text-sm font-medium">
        {locationLabel}
        <input name={type === "lost" ? "last_seen_location" : "found_at_location"} maxLength={120} className="mt-1 w-full rounded border p-2" />
      </label>
      <textarea name="private_details" placeholder="Private identifying details for admins only (optional)" maxLength={1000} rows={2} className="w-full rounded border p-2" />
      <label className="block text-sm">
        Photo (visible to signed-in campus users)
        <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full" />
      </label>
      {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending || categories.length === 0} className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-50">
        {pending ? "Saving…" : "Submit report"}
      </button>
      {categories.length === 0 && <p className="text-sm text-red-600">No active categories are available. Contact an admin.</p>}
    </form>
  );
}
