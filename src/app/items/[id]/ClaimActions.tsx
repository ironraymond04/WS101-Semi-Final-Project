"use client";

import { respondToClaim, withdrawClaim } from "@/app/actions/items";

type Claim = {
  id: string;
  evidence: string;
  status: string;
};

export default function ClaimActions({ claim }: { claim: Claim }) {
  return (
    <section className="mt-5 space-y-3 rounded border p-3">
      <p>Your claim is <strong>{claim.status.replaceAll("_", " ")}</strong>.</p>
      {claim.status === "needs_info" && (
        <form action={respondToClaim} className="space-y-2">
          <input type="hidden" name="claim_id" value={claim.id} />
          <textarea name="message" required minLength={1} maxLength={2000} placeholder="Provide the requested information" className="w-full rounded border p-2" />
          <button className="rounded bg-blue-700 px-3 py-1.5 text-white">Send information</button>
        </form>
      )}
      {["pending", "needs_info", "approved"].includes(claim.status) && (
        <form action={withdrawClaim}>
          <input type="hidden" name="claim_id" value={claim.id} />
          <button className="rounded border px-3 py-1.5">Withdraw claim</button>
        </form>
      )}
    </section>
  );
}
