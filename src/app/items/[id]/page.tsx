import { notFound } from "next/navigation";
import Link from "next/link";
import {
  createPossibleMatch,
  receiveFoundNotice,
  withdrawReport,
} from "@/app/actions/items";
import { createClient } from "@/lib/supabase/server";
import ClaimForm from "./ClaimForm";
import ClaimActions from "./ClaimActions";
import ReportEditForm from "./ReportEditForm";

/* ---------- shared styles ---------- */
const btnBase =
  "cursor-pointer whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-950";
const btnPrimary = `${btnBase} bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-500`;
const btnSuccess = `${btnBase} bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-500`;
const btnGhost = `${btnBase} border border-neutral-700 text-neutral-200 hover:bg-neutral-800 focus:ring-neutral-500`;
const btnDanger = `${btnBase} border border-red-500/40 text-red-300 hover:bg-red-500/10 focus:ring-red-500`;
const field =
  "w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30";

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

export default async function ReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const [
    { data: lostReport, error: lostError },
    { data: foundNotice, error: foundError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    supabase.from("lost_reports").select("*").eq("id", id).maybeSingle(),
    supabase.from("found_notices").select("*").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
  ]);
  if (lostError || foundError || profileError) throw new Error("Could not load report.");
  if (!lostReport && !foundNotice) notFound();
  if (lostReport && foundNotice) throw new Error("Report identifier is ambiguous.");

  const isAdmin = profile.role === "admin";
  const reportType = lostReport ? "lost" : "found";
  const reportId = id;
  const ownerQuery = supabase.from("report_owners").select("owner_id").eq(
    lostReport ? "lost_report_id" : "found_notice_id",
    id,
  ).maybeSingle();
  const privateQuery = lostReport
    ? supabase.from("lost_report_private_details").select("details").eq("lost_report_id", id).maybeSingle()
    : supabase.from("found_notice_private_details").select("details").eq("found_notice_id", id).maybeSingle();
  const [{ data: owner, error: ownerError }, { data: privateDetails, error: privateError }] =
    await Promise.all([ownerQuery, privateQuery]);
  if (ownerError || privateError) throw new Error("Could not load report access details.");

  const isOwner = owner?.owner_id === user.id;
  const canManage = isAdmin || isOwner;
  const report = lostReport ?? foundNotice!;
  const [{ data: category, error: categoryError }, { data: categories, error: categoriesError }] = await Promise.all([
    supabase.from("categories").select("id,name").eq("id", report.category_id).maybeSingle(),
    supabase.from("categories").select("id,name").eq("active", true).order("name"),
  ]);
  if (categoryError || categoriesError) throw new Error("Could not load report categories.");

  const ownerProfile = isAdmin && owner?.owner_id
    ? await supabase.from("profiles").select("full_name,email").eq("id", owner.owner_id).single()
    : null;
  if (ownerProfile?.error) throw new Error("Could not load reporter profile.");

  let ownOpenLostReports: Array<{ id: string; title: string }> = [];
  if (!lostReport && !isAdmin) {
    const { data: ownerLinks, error: ownerLinksError } = await supabase
      .from("report_owners")
      .select("lost_report_id")
      .eq("owner_id", user.id)
      .not("lost_report_id", "is", null);
    if (ownerLinksError) throw new Error("Could not load your lost reports.");
    const reportIds = ownerLinks?.flatMap((link) => link.lost_report_id ? [link.lost_report_id] : []) ?? [];
    if (reportIds.length) {
      const ownReportsResult = await supabase.from("lost_reports")
        .select("id,title")
        .in("id", reportIds)
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (ownReportsResult.error) throw new Error("Could not load your open lost reports.");
      ownOpenLostReports = ownReportsResult.data ?? [];
    }
  }

  const claimsResult = foundNotice
    ? await supabase.from("claim_attempts")
        .select("id,claimant_id,lost_report_id,evidence,status,created_at")
        .eq("found_notice_id", id)
        .order("created_at", { ascending: true })
    : null;
  if (claimsResult?.error) throw new Error("Could not load claim status.");
  const myClaim = claimsResult?.data?.find((claim) => claim.claimant_id === user.id);
  const activeClaim = claimsResult?.data?.find((claim) => claim.status === "approved");
  const isAvailableForClaim = foundNotice?.status === "received";

  const location = lostReport
    ? lostReport.last_seen_location ?? "Location unknown"
    : foundNotice!.found_at_location ?? "Location unknown";
  const date = lostReport
    ? lostReport.last_seen_on ?? "Date unknown"
    : foundNotice!.found_at_on ?? "Date unknown";
  const canEdit = isOwner && (report.status === "open" || report.status === "pre_desk");
  const imageUrl = report.image_path
    ? `/api/report-images/${report.image_path.split("/").map(encodeURIComponent).join("/")}`
    : null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-8 sm:px-6">
        <Link href="/items" className={`${btnGhost} inline-block`}>← All reports</Link>

        {/* ---------- Main card ---------- */}
        <article className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60 shadow-sm">
          {imageUrl && (
            <img src={imageUrl} alt={report.title} className="h-72 w-full object-cover" />
          )}

          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-white ${
                  reportType === "lost" ? "bg-rose-600/90" : "bg-emerald-600/90"
                }`}
              >
                {reportType === "lost" ? "Lost report" : "Found notice"}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                  statusStyle[report.status] ?? "bg-neutral-500/15 text-neutral-300 ring-neutral-500/30"
                }`}
              >
                {statusLabel[report.status] ?? report.status}
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">{report.title}</h1>

            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-lg bg-neutral-800 px-2.5 py-1 text-neutral-200">{category?.name ?? "Other"}</span>
              <span className="rounded-lg bg-neutral-800 px-2.5 py-1 text-neutral-300">📍 {location}</span>
              <span className="rounded-lg bg-neutral-800 px-2.5 py-1 text-neutral-300">🗓 {date}</span>
            </div>

            <p className="whitespace-pre-line leading-relaxed text-neutral-300">{report.description}</p>
          </div>
        </article>

        {/* ---------- Private details ---------- */}
        {canManage && privateDetails?.details && (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5">
            <h2 className="mb-1 text-sm font-semibold text-amber-200">🔒 Private identifying details</h2>
            <p className="whitespace-pre-line text-sm text-amber-100/90">{privateDetails.details}</p>
          </section>
        )}

        {/* ---------- Reporter (admin only) ---------- */}
        {ownerProfile?.data && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Reporter</p>
            <p className="mt-1 text-neutral-200">
              {ownerProfile.data.full_name} <span className="text-neutral-500">·</span>{" "}
              <span className="text-neutral-400">{ownerProfile.data.email}</span>
            </p>
          </div>
        )}

        {/* ---------- Owner tools ---------- */}
        {canEdit && (
          <>
            <ReportEditForm
              reportId={reportId}
              kind={reportType}
              categories={categories ?? []}
              values={{
                title: report.title,
                description: report.description,
                category_id: report.category_id,
                date: lostReport ? lostReport.last_seen_on : foundNotice!.found_at_on,
                location: lostReport ? lostReport.last_seen_location : foundNotice!.found_at_location,
                private_details: privateDetails?.details ?? "",
              }}
            />

            <form action={withdrawReport}>
              <input type="hidden" name="report_id" value={reportId} />
              <input type="hidden" name="kind" value={reportType} />
              <button className={btnDanger}>Withdraw report</button>
            </form>
          </>
        )}

        {/* ---------- Admin: desk receipt ---------- */}
        {isAdmin && foundNotice?.status === "pre_desk" && (
          <form action={receiveFoundNotice}>
            <input type="hidden" name="notice_id" value={id} />
            <button className={btnSuccess}>Record desk receipt</button>
          </form>
        )}

        {/* ---------- Claims ---------- */}
        {!lostReport && foundNotice && !canManage && myClaim
          && ["pending", "needs_info", "approved"].includes(myClaim.status) && (
            <ClaimActions claim={myClaim} />
        )}
        {!lostReport && foundNotice && isAvailableForClaim && !canManage
          && (!myClaim || !["pending", "needs_info", "approved"].includes(myClaim.status)) && (
            <ClaimForm foundNoticeId={id} lostReports={ownOpenLostReports} />
        )}

        {/* ---------- Notices ---------- */}
        {foundNotice?.status === "pre_desk" && !canManage && (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            This item has not been received by the campus desk, so it cannot be claimed yet.
          </p>
        )}

        {activeClaim && isAdmin && (
          <p className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
            Reserved for claimant {activeClaim.claimant_id}. Record handover from the admin page after pickup.
          </p>
        )}

        {/* ---------- Admin: possible match ---------- */}
        {foundNotice && isAdmin && (
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-white">Link a possible match</h2>
            <p className="mt-0.5 text-xs text-neutral-500">Enter the UUID of a lost report that may belong to this item.</p>
            <form action={createPossibleMatch} className="mt-3 flex flex-wrap gap-2">
              <input type="hidden" name="found_notice_id" value={id} />
              <label className="sr-only" htmlFor="lost-report-match">Possible matching lost report</label>
              <input
                id="lost-report-match"
                name="lost_report_id"
                placeholder="Lost report UUID"
                className={`${field} min-w-64 flex-1`}
                required
              />
              <button className={btnPrimary}>Record possible match</button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}