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

  return (
    <main className="mx-auto max-w-5xl space-y-10 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin workspace</h1>
        <Link href="/items" className="text-sm text-blue-700">Back to reports</Link>
      </header>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Claims</h2>
        <ul className="space-y-4">
          {claims?.map((claim) => {
            const notice = noticeById.get(claim.found_notice_id);
            const claimant = profileById.get(claim.claimant_id);
            const claimMessages = messagesByClaim.get(claim.id) ?? [];
            return (
              <li key={claim.id} className="space-y-3 rounded border p-4">
                <div>
                  <p className="font-medium">{notice?.title ?? "Found item"} · {claim.status.replaceAll("_", " ")}</p>
                  <p className="text-sm text-gray-600">{claimant?.full_name} · {claimant?.email}</p>
                  <p className="mt-2 text-sm"><strong>Private claim evidence:</strong> {claim.evidence}</p>
                  {claimMessages.map((message) => (
                    <p key={message.id} className="mt-1 text-sm text-gray-700">
                      {profileById.get(message.sender_id)?.full_name ?? "Admin"}: {message.message}
                    </p>
                  ))}
                </div>
                {claim.status === "pending" || claim.status === "needs_info" ? (
                  <form action={reviewClaim} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="claim_id" value={claim.id} />
                    <label className="text-sm">
                      Decision
                      <select name="decision" className="mt-1 block rounded border p-2">
                        <option value="needs_info">Request more information</option>
                        <option value="approved">Approve and reserve</option>
                        <option value="rejected">Reject</option>
                      </select>
                    </label>
                    <label className="min-w-64 flex-1 text-sm">
                      Private note / request
                      <input name="message" maxLength={2000} className="mt-1 w-full rounded border p-2" />
                    </label>
                    <button className="rounded bg-blue-700 px-3 py-2 text-white">Save review</button>
                  </form>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <form action={recordHandover} className="flex gap-2">
                      <input type="hidden" name="claim_id" value={claim.id} />
                      <input name="notes" placeholder="Handover note (optional)" maxLength={1000} className="rounded border p-2" />
                      <button className="rounded bg-green-700 px-3 py-2 text-white">Record handover</button>
                    </form>
                    <form action={releaseReservation} className="flex gap-2">
                      <input type="hidden" name="claim_id" value={claim.id} />
                      <input name="reason" required minLength={1} maxLength={1000} placeholder="Reason to release" className="rounded border p-2" />
                      <button className="rounded border px-3 py-2">Release reservation</button>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {claims?.length === 0 && <p className="text-sm text-gray-500">No claims need review.</p>}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Found notices and custody</h2>
        <ul className="space-y-3">
          {notices?.map((notice) => (
            <li key={notice.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3">
              <div>
                <a href={`/items/${notice.id}`} className="font-medium text-blue-700">{notice.title}</a>
                <p className="text-sm text-gray-600">{notice.status.replaceAll("_", " ")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {notice.status === "pre_desk" && (
                  <form action={receiveFoundNotice}>
                    <input type="hidden" name="notice_id" value={notice.id} />
                    <button className="rounded bg-green-700 px-3 py-2 text-white">Receive at desk</button>
                  </form>
                )}
                {notice.status === "received" && (
                  <form action={disposeFoundNotice} className="flex gap-2">
                    <input type="hidden" name="notice_id" value={notice.id} />
                    <input name="outcome" required maxLength={1000} placeholder="Disposition under campus policy" className="rounded border p-2" />
                    <button className="rounded border px-3 py-2">Record disposition</button>
                  </form>
                )}
                {["pre_desk", "received"].includes(notice.status) && (
                  <form action={markDuplicateNotice} className="flex gap-2">
                    <input type="hidden" name="notice_id" value={notice.id} />
                    <input name="canonical_id" required placeholder="Canonical notice UUID" className="w-56 rounded border p-2" />
                    <button className="rounded border px-3 py-2">Mark duplicate</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Open lost reports</h2>
        <ul className="space-y-3">
          {lostReports?.map((report) => {
            const owner = profileById.get(ownerByReport.get(report.id) ?? "");
            return (
              <li key={report.id} className="rounded border p-3">
                <a href={`/items/${report.id}`} className="font-medium text-blue-700">{report.title}</a>
                <p className="text-sm text-gray-600">{owner?.full_name} · {owner?.email}</p>
                <form action={closeStaleLostReport} className="mt-2 flex gap-2">
                  <input type="hidden" name="report_id" value={report.id} />
                  <input name="reason" required maxLength={1000} placeholder="Contact and closure reason" className="flex-1 rounded border p-2" />
                  <button className="rounded border px-3 py-2">Close stale report</button>
                </form>
              </li>
            );
          })}
        </ul>
        {lostReports?.length === 0 && <p className="text-sm text-gray-500">No open lost reports.</p>}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Categories</h2>
        <ul className="mb-3 space-y-2">
          {categories?.map((category) => (
            <li key={category.id} className="flex items-center justify-between border-b py-2">
              <span>{category.name}{category.active ? "" : " (inactive)"}</span>
              <form action={saveCategory} className="flex gap-2">
                <input type="hidden" name="id" value={category.id} />
                <input name="name" defaultValue={category.name} required minLength={2} maxLength={60} className="rounded border p-2" />
                <button className="rounded border px-3">Rename</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={saveCategory} className="flex gap-2">
          <input name="name" required minLength={2} maxLength={60} placeholder="New category" className="rounded border p-2" />
          <button className="rounded border px-3">Add category</button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Appoint admin</h2>
        <form action={appointAdmin} className="flex gap-2">
          <input name="user_id" type="text" required placeholder="Student profile UUID" className="rounded border p-2" />
          <button className="rounded border px-3">Appoint</button>
        </form>
      </section>
    </main>
  );
}
