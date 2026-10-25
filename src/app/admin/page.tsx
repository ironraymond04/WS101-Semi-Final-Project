import { redirect } from "next/navigation";
import Link from "next/link";
import {
  appointAdmin,
  closeStaleLostReport,
  disposeFoundNotice,
  markDuplicateNotice,
  receiveFoundNotice,
  recordHandover,
  releaseReservation,
  reviewClaim,
  saveCategory,
} from "@/app/actions/items";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

/* ---------- shared styles ---------- */
const input =
  "w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30";
const btnBase =
  "cursor-pointer whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900";
const btnPrimary = `${btnBase} bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-500`;
const btnSuccess = `${btnBase} bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-500`;
const btnGhost = `${btnBase} border border-neutral-700 text-neutral-200 hover:bg-neutral-800 focus:ring-neutral-500`;
const optionClass = "bg-neutral-900 text-white";

const badgeStyles: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  needs_info: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  pre_desk: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  received: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  reserved: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
};

function StatusBadge({ status }: { status: string }) {
  const style = badgeStyles[status] ?? "bg-neutral-500/15 text-neutral-300 ring-neutral-500/30";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${style}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function Section({
  title,
  description,
  count,
  children,
}: {
  title: string;
  description?: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-neutral-400">{description}</p>}
        </div>
        {count !== undefined && (
          <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs font-medium text-neutral-300">{count}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-neutral-800 px-4 py-6 text-center text-sm text-neutral-500">
      {children}
    </p>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profileError) throw new Error("Could not verify admin access.");
  if (me.role !== "admin") redirect("/items");

  const [
    { data: claims, error: claimsError },
    { data: notices, error: noticesError },
    { data: lostReports, error: lostError },
    { data: categories, error: categoriesError },
    { data: owners, error: ownersError },
  ] = await Promise.all([
    supabase.from("claim_attempts")
      .select("id,found_notice_id,claimant_id,lost_report_id,evidence,status,created_at")
      .in("status", ["pending", "needs_info", "approved"])
      .order("created_at"),
    supabase.from("found_notices").select("id,title,status,canonical_found_notice_id,received_at,created_at")
      .order("created_at", { ascending: false }),
    supabase.from("lost_reports").select("id,title,status,created_at")
      .eq("status", "open").order("created_at", { ascending: false }),
    supabase.from("categories").select("id,name,active").order("name"),
    supabase.from("report_owners").select("owner_id,lost_report_id,found_notice_id"),
  ]);
  if (claimsError || noticesError || lostError || categoriesError || ownersError) {
    throw new Error("Could not load admin workspace.");
  }

  const noticeById = new Map((notices ?? []).map((notice) => [notice.id, notice]));
  const ownerByReport = new Map((owners ?? []).map((owner) => [
    owner.lost_report_id ?? owner.found_notice_id ?? "",
    owner.owner_id,
  ]));
  const userIds = [...new Set([
    ...(claims ?? []).map((claim) => claim.claimant_id),
    ...ownerByReport.values(),
  ])];
  const [{ data: profiles, error: profilesError }, { data: messages, error: messagesError }] = await Promise.all([
    userIds.length ? supabase.from("profiles").select("id,full_name,email").in("id", userIds) : Promise.resolve({ data: [], error: null }),
    (claims ?? []).length
      ? supabase.from("claim_messages").select("id,claim_id,sender_id,message,created_at")
        .in("claim_id", claims!.map((claim) => claim.id)).order("created_at")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profilesError || messagesError) throw new Error("Could not load claim review details.");

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const messagesByClaim = new Map<string, Tables<"claim_messages">[]>();
  for (const message of messages ?? []) {
    const existing = messagesByClaim.get(message.claim_id) ?? [];
    existing.push(message);
    messagesByClaim.set(message.claim_id, existing);
  }

  const awaitingReview = (claims ?? []).filter((c) => c.status === "pending" || c.status === "needs_info").length;
  const awaitingDesk = (notices ?? []).filter((n) => n.status === "pre_desk").length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Admin workspace</h1>
            <p className="mt-1 text-sm text-neutral-400">Review claims, manage custody, and maintain categories.</p>
          </div>
          <Link href="/items" className={btnGhost}>← Back to reports</Link>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Claims to review" value={awaitingReview} tone="text-amber-300" />
          <Stat label="Awaiting desk" value={awaitingDesk} tone="text-sky-300" />
          <Stat label="Open lost reports" value={lostReports?.length ?? 0} tone="text-rose-300" />
          <Stat label="Categories" value={categories?.length ?? 0} tone="text-emerald-300" />
        </div>

        {/* ---------- Claims ---------- */}
        <Section title="Claims" description="Claims waiting for a decision or handover." count={claims?.length ?? 0}>
          {claims?.length === 0 ? (
            <Empty>No claims need review.</Empty>
          ) : (
            <ul className="space-y-4">
              {claims?.map((claim) => {
                const notice = noticeById.get(claim.found_notice_id);
                const claimant = profileById.get(claim.claimant_id);
                const claimMessages = messagesByClaim.get(claim.id) ?? [];
                return (
                  <li key={claim.id} className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white">{notice?.title ?? "Found item"}</p>
                        <StatusBadge status={claim.status} />
                      </div>
                      <p className="text-sm text-neutral-400">
                        {claimant?.full_name} · {claimant?.email}
                      </p>
                      <div className="rounded-lg bg-neutral-950 p-3 text-sm">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Private claim evidence</p>
                        <p className="text-neutral-200">{claim.evidence}</p>
                      </div>
                      {claimMessages.length > 0 && (
                        <div className="space-y-1.5 border-l-2 border-neutral-700 pl-3">
                          {claimMessages.map((message) => (
                            <p key={message.id} className="text-sm text-neutral-300">
                              <span className="font-medium text-neutral-100">
                                {profileById.get(message.sender_id)?.full_name ?? "Admin"}:
                              </span>{" "}
                              {message.message}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {claim.status === "pending" || claim.status === "needs_info" ? (
                      <form action={reviewClaim} className="flex flex-wrap items-end gap-3 border-t border-neutral-800 pt-4">
                        <input type="hidden" name="claim_id" value={claim.id} />
                        <label className="text-sm text-neutral-300">
                          Decision
                          <select name="decision" className={`${input} mt-1 min-w-52`}>
                            <option value="needs_info" className={optionClass}>Request more information</option>
                            <option value="approved" className={optionClass}>Approve and reserve</option>
                            <option value="rejected" className={optionClass}>Reject</option>
                          </select>
                        </label>
                        <label className="min-w-64 flex-1 text-sm text-neutral-300">
                          Private note / request
                          <input name="message" maxLength={2000} className={`${input} mt-1`} />
                        </label>
                        <button className={btnPrimary}>Save review</button>
                      </form>
                    ) : (
                      <div className="flex flex-wrap gap-3 border-t border-neutral-800 pt-4">
                        <form action={recordHandover} className="flex flex-1 gap-2">
                          <input type="hidden" name="claim_id" value={claim.id} />
                          <input name="notes" placeholder="Handover note (optional)" maxLength={1000} className={`${input} min-w-48 flex-1`} />
                          <button className={btnSuccess}>Record handover</button>
                        </form>
                        <form action={releaseReservation} className="flex flex-1 gap-2">
                          <input type="hidden" name="claim_id" value={claim.id} />
                          <input name="reason" required minLength={1} maxLength={1000} placeholder="Reason to release" className={`${input} min-w-48 flex-1`} />
                          <button className={btnGhost}>Release</button>
                        </form>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {/* ---------- Found notices ---------- */}
        <Section title="Found notices and custody" description="Track items from discovery to disposition." count={notices?.length ?? 0}>
          {notices?.length === 0 ? (
            <Empty>No found notices yet.</Empty>
          ) : (
            <ul className="space-y-3">
              {notices?.map((notice) => (
                <li key={notice.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                  <div className="space-y-1">
                    <Link href={`/items/${notice.id}`} className="font-medium text-blue-400 hover:text-blue-300 hover:underline">
                      {notice.title}
                    </Link>
                    <div><StatusBadge status={notice.status} /></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {notice.status === "pre_desk" && (
                      <form action={receiveFoundNotice}>
                        <input type="hidden" name="notice_id" value={notice.id} />
                        <button className={btnSuccess}>Receive at desk</button>
                      </form>
                    )}
                    {notice.status === "received" && (
                      <form action={disposeFoundNotice} className="flex gap-2">
                        <input type="hidden" name="notice_id" value={notice.id} />
                        <input name="outcome" required maxLength={1000} placeholder="Disposition under campus policy" className={`${input} w-64`} />
                        <button className={btnGhost}>Record disposition</button>
                      </form>
                    )}
                    {["pre_desk", "received"].includes(notice.status) && (
                      <form action={markDuplicateNotice} className="flex gap-2">
                        <input type="hidden" name="notice_id" value={notice.id} />
                        <input name="canonical_id" required placeholder="Canonical notice UUID" className={`${input} w-56`} />
                        <button className={btnGhost}>Mark duplicate</button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* ---------- Open lost reports ---------- */}
        <Section title="Open lost reports" description="Close reports that have gone stale." count={lostReports?.length ?? 0}>
          {lostReports?.length === 0 ? (
            <Empty>No open lost reports.</Empty>
          ) : (
            <ul className="space-y-3">
              {lostReports?.map((report) => {
                const owner = profileById.get(ownerByReport.get(report.id) ?? "");
                return (
                  <li key={report.id} className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                    <div>
                      <Link href={`/items/${report.id}`} className="font-medium text-blue-400 hover:text-blue-300 hover:underline">
                        {report.title}
                      </Link>
                      <p className="text-sm text-neutral-400">{owner?.full_name} · {owner?.email}</p>
                    </div>
                    <form action={closeStaleLostReport} className="flex flex-wrap gap-2">
                      <input type="hidden" name="report_id" value={report.id} />
                      <input name="reason" required maxLength={1000} placeholder="Contact and closure reason" className={`${input} min-w-64 flex-1`} />
                      <button className={btnGhost}>Close stale report</button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {/* ---------- Categories ---------- */}
        <Section title="Categories" description="Rename existing categories or add a new one." count={categories?.length ?? 0}>
          <ul className="mb-5 divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
            {categories?.map((category) => (
              <li key={category.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-100">{category.name}</span>
                  {!category.active && (
                    <span className="rounded-full bg-neutral-700/50 px-2 py-0.5 text-xs text-neutral-400">inactive</span>
                  )}
                </div>
                <form action={saveCategory} className="flex gap-2">
                  <input type="hidden" name="id" value={category.id} />
                  <input name="name" defaultValue={category.name} required minLength={2} maxLength={60} className={`${input} w-52`} />
                  <button className={btnGhost}>Rename</button>
                </form>
              </li>
            ))}
          </ul>
          <form action={saveCategory} className="flex flex-wrap gap-2">
            <input name="name" required minLength={2} maxLength={60} placeholder="New category" className={`${input} min-w-52 flex-1`} />
            <button className={btnPrimary}>Add category</button>
          </form>
        </Section>

        {/* ---------- Appoint admin ---------- */}
        <Section title="Appoint admin" description="Grant admin access using the student's profile UUID.">
          <form action={appointAdmin} className="flex flex-wrap gap-2">
            <input name="user_id" type="text" required placeholder="Student profile UUID" className={`${input} min-w-64 flex-1`} />
            <button className={btnPrimary}>Appoint</button>
          </form>
        </Section>
      </main>
    </div>
  );
}