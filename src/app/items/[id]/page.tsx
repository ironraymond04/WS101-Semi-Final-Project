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

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/items" className="text-sm text-blue-700">← All reports</Link>
      {report.image_path && (
        <img
          src={`/api/report-images/${report.image_path.split("/").map(encodeURIComponent).join("/")}`}
          alt={report.title}
          className="my-4 max-h-80 w-full rounded object-cover"
        />
      )}
      <span className="text-xs font-semibold uppercase">
        {reportType === "lost" ? "Lost report" : "Found notice"} · {report.status === "pre_desk" ? "Not yet at desk" : report.status}
      </span>
      <h1 className="text-2xl font-bold">{report.title}</h1>
      <p className="text-gray-600">
        {category?.name ?? "Other"} · {lostReport ? lostReport.last_seen_location ?? "Location unknown" : foundNotice!.found_at_location ?? "Location unknown"}
        {" · "}
        {lostReport ? lostReport.last_seen_on ?? "Date unknown" : foundNotice!.found_at_on ?? "Date unknown"}
      </p>
      <p className="my-3">{report.description}</p>

      {canManage && privateDetails?.details && (
        <section className="my-4 rounded border border-amber-400 bg-amber-50 p-3">
          <h2 className="font-semibold">Private identifying details</h2>
          <p>{privateDetails.details}</p>
        </section>
      )}

      {isOwner && (report.status === "open" || report.status === "pre_desk") && (
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
      )}

      {ownerProfile?.data && (
        <p className="text-sm text-gray-600">Reporter: {ownerProfile.data.full_name} · {ownerProfile.data.email}</p>
      )}

      {isOwner && (report.status === "open" || report.status === "pre_desk") && (
        <form action={withdrawReport} className="mt-4">
          <input type="hidden" name="report_id" value={reportId} />
          <input type="hidden" name="kind" value={reportType} />
          <button className="rounded border px-3 py-1.5">Withdraw report</button>
        </form>
      )}

      {isAdmin && foundNotice?.status === "pre_desk" && (
        <form action={receiveFoundNotice} className="mt-3">
          <input type="hidden" name="notice_id" value={id} />
          <button className="rounded bg-green-700 px-3 py-1.5 text-white">Record desk receipt</button>
        </form>
      )}

      {!lostReport && foundNotice && !canManage && myClaim
        && ["pending", "needs_info", "approved"].includes(myClaim.status) && (
          <ClaimActions claim={myClaim} />
      )}
      {!lostReport && foundNotice && isAvailableForClaim && !canManage
        && (!myClaim || !["pending", "needs_info", "approved"].includes(myClaim.status)) && (
          <ClaimForm foundNoticeId={id} lostReports={ownOpenLostReports} />
      )}

      {foundNotice?.status === "pre_desk" && !canManage && (
        <p className="mt-4 rounded bg-amber-50 p-3 text-sm">This item has not been received by the campus desk, so it cannot be claimed yet.</p>
      )}

      {activeClaim && isAdmin && (
        <p className="mt-4 rounded bg-blue-50 p-3 text-sm">Reserved for claimant {activeClaim.claimant_id}. Record handover from the admin page after pickup.</p>
      )}

      {foundNotice && isAdmin && (
        <form action={createPossibleMatch} className="mt-5 flex flex-wrap gap-2 border-t pt-4">
          <input type="hidden" name="found_notice_id" value={id} />
          <label className="sr-only" htmlFor="lost-report-match">Possible matching lost report</label>
          <input id="lost-report-match" name="lost_report_id" placeholder="Lost report UUID" className="min-w-64 rounded border p-2" required />
          <button className="rounded border px-3 py-2">Record possible match</button>
        </form>
      )}
    </main>
  );
}
