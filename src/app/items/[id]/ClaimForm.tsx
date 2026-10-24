"use client";

import { useActionState } from "react";
import { submitClaim } from "@/app/actions/items";

type LostReport = { id: string; title: string };

export default function ClaimForm({
  foundNoticeId,
  lostReports,
}: {
  foundNoticeId: string;
  lostReports: LostReport[];
}) {
  const [state, action, pending] = useActionState(submitClaim, undefined);
  return (
    <form action={action} className="mt-4 space-y-2">
      <input type="hidden" name="found_notice_id" value={foundNoticeId} />
      {lostReports.length > 0 && (
        <label className="block text-sm">
          Optional matching lost report
          <select name="lost_report_id" defaultValue="" className="mt-1 w-full rounded border p-2">
            <option value="">No linked report</option>
            {lostReports.map((report) => <option key={report.id} value={report.id}>{report.title}</option>)}
          </select>
        </label>
      )}
      {!lostReports.length && <input type="hidden" name="lost_report_id" value="" />}
      <textarea name="evidence" required minLength={10} maxLength={2000} rows={3} placeholder="Describe private details that prove ownership (at least 10 characters)" className="w-full rounded border p-2" />
      {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
        {pending ? "Submitting…" : "Submit claim"}
      </button>
    </form>
  );
}
