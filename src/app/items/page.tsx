import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";

type SearchParams = Promise<{ q?: string; type?: string }>;

/* ---------- shared styles ---------- */
const btnBase =
  "cursor-pointer whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-950";
const btnPrimary = `${btnBase} bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-500`;
const btnGhost = `${btnBase} border border-neutral-700 text-neutral-200 hover:bg-neutral-800 focus:ring-neutral-500`;

const statusLabel: Record<string, string> = {
  open: "Open",
  pre_desk: "Not yet at desk",
  received: "At desk",
  reserved: "Reserved",
};

const statusStyle: Record<string, string> = {
  open: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  pre_desk: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  received: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  reserved: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
};

export default async function ItemsPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, type } = await searchParams;
  const queryText = q?.trim().slice(0, 100);
  const activeType: "lost" | "found" | "" = type === "lost" || type === "found" ? type : "";
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

  // Builds a filter link that keeps the current search text
  const tabHref = (t: "lost" | "found" | "") => {
    const params = new URLSearchParams();
    if (queryText) params.set("q", queryText);
    if (t) params.set("type", t);
    const qs = params.toString();
    return qs ? `/items?${qs}` : "/items";
  };

  const tabs: { label: string; value: "lost" | "found" | "" }[] = [
    { label: "All", value: "" },
    { label: "Lost", value: "lost" },
    { label: "Found", value: "found" },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        {/* ---------- Header ---------- */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">SPC Lost &amp; Found</h1>
            <p className="mt-1 text-sm text-neutral-400">Search reports from around campus, or post your own.</p>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/items/new" className={btnPrimary}>+ Report item</Link>
            <Link href="/admin" className={btnGhost}>Admin</Link>
            <form action={signOut}>
              <button className={btnGhost}>Log out</button>
            </form>
          </nav>
        </header>

        {/* ---------- Search + filters ---------- */}
        <section className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 sm:p-5">
          <form className="flex flex-wrap gap-2">
            {activeType && <input type="hidden" name="type" value={activeType} />}
            <div className="relative min-w-64 flex-1">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                name="q"
                defaultValue={queryText}
                placeholder="Search item names…"
                maxLength={100}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 py-2.5 pl-9 pr-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <button className={btnPrimary}>Search</button>
            {queryText && (
              <Link href={tabHref(activeType).replace(/[?&]q=[^&]*&?/, "?").replace(/\?$/, "") || "/items"} className={btnGhost}>
                Clear
              </Link>
            )}
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-neutral-800 bg-neutral-950 p-1">
              {tabs.map((tab) => {
                const active = activeType === tab.value;
                return (
                  <Link
                    key={tab.label}
                    href={tabHref(tab.value)}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                      active ? "bg-neutral-800 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
            <p className="text-sm text-neutral-500">
              {visibleCards.length} {visibleCards.length === 1 ? "report" : "reports"}
              {queryText && <> matching <span className="text-neutral-300">&ldquo;{queryText}&rdquo;</span></>}
            </p>
          </div>
        </section>

        {/* ---------- Cards ---------- */}
        {visibleCards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-800 px-6 py-16 text-center">
            <p className="text-lg font-medium text-neutral-300">No reports found</p>
            <p className="mt-1 text-sm text-neutral-500">Try a different search, or be the first to post one.</p>
            <Link href="/items/new" className={`${btnPrimary} mt-5 inline-block`}>+ Report item</Link>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCards.map((card) => (
              <li key={`${card.type}-${card.id}`}>
                <Link
                  href={`/items/${card.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 transition hover:-translate-y-0.5 hover:border-neutral-600 hover:shadow-lg hover:shadow-black/40"
                >
                  <div className="relative h-44 overflow-hidden bg-neutral-800">
                    {card.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        alt={card.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-1 text-neutral-500">
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8">
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <circle cx="9" cy="11" r="1.5" />
                          <path d="m21 16-5-5-8 8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-xs">No photo</span>
                      </div>
                    )}
                    <span
                      className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur ${
                        card.type === "lost" ? "bg-rose-600/90 text-white" : "bg-emerald-600/90 text-white"
                      }`}
                    >
                      {card.type === "lost" ? "Lost" : "Found"}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="line-clamp-1 font-semibold text-white">{card.title}</h2>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          statusStyle[card.status] ?? "bg-neutral-500/15 text-neutral-300 ring-neutral-500/30"
                        }`}
                      >
                        {statusLabel[card.status] ?? card.status}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 text-sm text-neutral-400">{card.description}</p>

                    <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 border-t border-neutral-800 pt-3 text-xs text-neutral-500">
                      <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-neutral-300">{card.category}</span>
                      <span>📍 {card.location ?? "Location unknown"}</span>
                      <span>🗓 {card.date ?? "Date unknown"}</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}