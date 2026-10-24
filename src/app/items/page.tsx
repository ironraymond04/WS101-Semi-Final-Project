import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";

type SearchParams = Promise<{ q?: string; type?: string }>;

export default async function ItemsPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, type } = await searchParams;
  const queryText = q?.trim().slice(0, 100);
  const supabase = await createClient();

  let lostQuery = supabase
    .from("lost_reports")
    .select("id,title,description,category_id,last_seen_on,last_seen_location,image_path,status,created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  let foundQuery = supabase
    .from("found_notices")
    .select("id,title,description,category_id,found_at_on,found_at_location,image_path,status,created_at")
    .in("status", ["pre_desk", "received", "reserved"])
    .order("created_at", { ascending: false });

  if (queryText) {
    lostQuery = lostQuery.ilike("title", `%${queryText}%`);
    foundQuery = foundQuery.ilike("title", `%${queryText}%`);
  }

  const [{ data: lostReports, error: lostError }, { data: foundNotices, error: foundError }, { data: categories, error: categoryError }] =
    await Promise.all([
      type === "found" ? Promise.resolve({ data: [], error: null }) : lostQuery,
      type === "lost" ? Promise.resolve({ data: [], error: null }) : foundQuery,
      supabase.from("categories").select("id,name").eq("active", true),
    ]);

  if (lostError || foundError || categoryError) throw new Error("Could not load reports.");
  const categoryNames = new Map((categories ?? []).map((category) => [category.id, category.name]));

  const cards = [
    ...(lostReports ?? []).map((report) => ({
      id: report.id,
      type: "lost" as const,
      title: report.title,
      description: report.description,
      category: categoryNames.get(report.category_id) ?? "Other",
      location: report.last_seen_location,
      date: report.last_seen_on,
      imagePath: report.image_path,
      status: report.status,
      createdAt: report.created_at,
    })),
    ...(foundNotices ?? []).map((notice) => ({
      id: notice.id,
      type: "found" as const,
      title: notice.title,
      description: notice.description,
      category: categoryNames.get(notice.category_id) ?? "Other",
      location: notice.found_at_location,
      date: notice.found_at_on,
      imagePath: notice.image_path,
      status: notice.status,
      createdAt: notice.created_at,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const visibleCards = cards.map((card) => ({
    ...card,
    imageUrl: card.imagePath
      ? `/api/report-images/${card.imagePath.split("/").map(encodeURIComponent).join("/")}`
      : null,
  }));

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campus Lost &amp; Found</h1>
        <nav className="flex gap-3 text-sm">
          <Link href="/items/new" className="rounded bg-blue-600 px-3 py-1.5 text-white">Report item</Link>
          <Link href="/admin" className="px-3 py-1.5">Admin</Link>
          <form action={signOut}><button className="px-3 py-1.5">Log out</button></form>
        </nav>
      </header>

      <form className="mb-6 flex gap-2">
        <input name="q" defaultValue={queryText} placeholder="Search item names…" maxLength={100} className="flex-1 rounded border p-2" />
        <select name="type" defaultValue={type === "lost" || type === "found" ? type : ""} className="rounded border p-2">
          <option value="">All reports</option><option value="lost">Lost</option><option value="found">Found</option>
        </select>
        <button className="rounded border px-4">Search</button>
      </form>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((card) => (
          <li key={`${card.type}-${card.id}`} className="overflow-hidden rounded border">
            <Link href={`/items/${card.id}`}>
              {card.imageUrl ? (
                <img src={card.imageUrl} alt={card.title} className="h-40 w-full object-cover" />
              ) : (
                <div className="flex h-40 items-center justify-center bg-gray-100 text-gray-400">No photo</div>
              )}
              <div className="p-3">
                <span className={`text-xs font-semibold uppercase ${card.type === "lost" ? "text-red-600" : "text-green-600"}`}>
                  {card.type === "lost" ? "Lost report" : "Found notice"} · {card.status === "pre_desk" ? "Not yet at desk" : card.status}
                </span>
                <h2 className="font-medium">{card.title}</h2>
                <p className="text-sm text-gray-500">{card.category} · {card.location ?? "Location unknown"} · {card.date ?? "Date unknown"}</p>
                <p className="mt-2 line-clamp-2 text-sm">{card.description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {visibleCards.length === 0 && <p className="text-gray-500">No reports found.</p>}
    </main>
  );
}
