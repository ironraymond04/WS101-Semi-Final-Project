# Campus Lost and Found

## Goal

Help members of one campus report lost and found property, discover possible matches, verify ownership, and return desk-held items. The system must distinguish a report about an item from the campus's custody of that item.

## Scope

### In scope

- Student and admin accounts for one campus.
- Lost reports and found notices as separate records.
- Searchable, authenticated-campus-user summaries and possible-match links.
- Admin-confirmed desk receipt, confidential ownership claims, and recorded handover.
- Admin-managed categories, image uploads, email updates for actionable milestones, and an admin-only disposition history.
- Admin-mediated coordination; no student-to-student messaging.

### Out of scope

- Multi-campus tenancy.
- Automatic item matching that asserts ownership. Any suggested match is only a candidate.
- Automatic expiry of lost reports, automatic release of a reserved item, or automatic disposal.
- Automatic handling rules for special property.
- Direct messaging or disclosure of reporter contact details to other students.

## People and access

- **Student:** A campus member with a verified email address on an approved campus domain. Students may create and manage their own eligible reports, browse safe summaries, submit claims, provide requested evidence, and withdraw their own claims before handover.
- **Admin:** A trusted campus operator who can manage categories, confirm custody, review claims and possible matches, record handover, manage reservations, close stale reports with a reason, and record item disposition.
- **Campus owner:** A trusted person who provisions the first admin outside public signup. Existing admins may appoint additional admins; appointments must be attributable to the acting admin.

All new accounts are students. Admin assignment is never available through public signup or self-promotion. The approved campus email domain(s) must be configured before student signup is enabled.

## Domain model

### Lost report

A student's open statement that they are looking for an item. It describes the last-seen event, which may have an approximate or unknown date and place. It may be linked to zero or more candidate found notices. It is marked recovered only after a linked found item is handed over to its verified owner; it may instead be withdrawn by its owner or closed by an admin under the rules below.

### Found notice and custody

A found notice records that a finder or admin has encountered an item. A student may submit a notice before bringing the item to campus; that notice is explicitly **not yet at the desk**, is not claimable, and does not resolve a lost report. Only an admin can confirm receipt into campus custody. An admin may also create a found notice when an item is handed directly to the desk.

One canonical found record represents an item held by the desk. Duplicate found notices remain traceable and link to that canonical record; they do not create separate claimable custody records.

### Possible match

A candidate relationship between a lost report and a found notice. One found notice may have multiple candidate lost reports, and one lost report may have multiple candidate found notices. A match is not proof of ownership and does not reserve, resolve, or close either report.

### Claim and claim attempt

A claim is a student's request to receive a desk-held found item. A student may claim without having filed a lost report; linking a matching lost report is optional. Only a found item confirmed as received by an admin is claimable.

Each claim attempt is preserved for review history. A student may have at most one active attempt for the same found item at a time. A rejected student may submit a new attempt with no fixed retry cap. Multiple students may have pending attempts for the same item.

### Reservation and handover

Admin approval reserves the item for pickup; it does not mean the item has been returned. Other claims remain pending while the reservation is active. A claimant may withdraw before handover. If a reservation is released or withdrawn, an admin reviews remaining pending claims; none is automatically approved.

Handover is the admin-recorded physical return of the item to its verified owner. Handover completes the selected claim, resolves the linked lost report if one exists, and closes competing claims for that item.

## Functional requirements

### Reports and discovery

1. Students can create both lost reports and found notices. Admins can create a found notice for an item received directly by the desk.
2. A report requires an item name and category and a useful description. Event date and general place may be approximate or unknown. Photos are optional.
3. Lost reports record last-seen facts; found notices record found-at facts. Do not force either report to use exact dates or precise locations.
4. Categories are maintained by admins. An “Other” category remains available.
5. Signed-in students and admins can browse and search safe report summaries. Anonymous visitors cannot browse reports.
6. A pre-desk found notice is visibly labeled as not yet at the desk. It cannot be claimed and does not resolve or reserve a lost report.
7. Students can correct or withdraw their own open lost reports and pre-desk found notices. Once an item is received by the desk, admins control its custody details and status. Students cannot mark an item returned.
8. Admins may close a stale lost report only after contacting its owner and recording a reason. Lost reports do not automatically expire.
9. Admins can mark duplicate found notices and link them to the canonical found record.

### Matching and claims

1. The app may suggest candidate matches from report details. Students or admins may record a possible-match relationship between a found notice and a lost report. Candidates can coexist; a suggestion or link must not select an owner automatically.
2. A student can submit a claim only for a desk-received found item and cannot claim their own found notice.
3. Claim evidence is private to the claimant and admins. It must not be visible to the finder, item reporter, other claimants, or other students.
4. Admins can request more information, approve, or reject a claim. A request for more information does not count as rejection and remains part of the same active attempt.
5. Rejected attempts remain in history. A new attempt may be submitted after rejection, with no fixed retry limit and no more than one active attempt per claimant and item.
6. Admin approval reserves the item for pickup. At most one active reservation may exist for a found item. Competing claims remain pending until handover. A claimant may withdraw before handover; an admin then reviews other pending claims.
7. If pickup is missed, only an admin may release the reservation under campus policy. The system must not invent a deadline or automatically expire the reservation.
8. An admin records handover only after physical transfer. The selected claim is completed, its optional linked lost report is resolved, and competing claims are closed.

### Images, identity, and communication

1. All item photos are visible to signed-in campus users, including photos that may reveal identifying details. This is an intentional policy choice; photos are not verification-only evidence.
2. Photos must not be publicly accessible to unauthenticated people. Storage reads must require an authenticated campus user.
3. Reporter identity and contact information are admin-only. Students must not see another reporter's name, email, or other direct contact details on a report.
4. Admins mediate communication using the campus email on the account. There is no student-to-student messaging.
5. Email notifications cover actionable milestones: claim received, more information requested, claim approved/rejected, pickup required, found item received where relevant, and completed return. Notification content must not include private claim evidence.

### Special property and disposition

1. Admins follow campus policy for special or safety-sensitive property; the app must not publish it as an ordinary listing unless campus policy allows it.
2. After the campus disposition process, an admin records the outcome and date. Disposed items are removed from student search and cannot be claimed, but remain in an admin-only archive.
3. No holding deadline, automatic disposal, or retention duration is defined until campus policy supplies it.

## Security and implementation constraints

- All application-originated writes must be initiated by Next.js Server Actions. This includes report and claim changes, admin review, category management, handover/disposition records, profile/admin changes, and Storage upload/removal. Read-only page queries may remain in Server Components.
- Validate every Server Action input with Zod on the server. Client-side validation may improve usability but is not a security boundary.
- Enforce authorization and row/record visibility in Supabase Postgres and Storage RLS policies. UI guards are supplementary and never the authorization boundary.
- Use the authenticated user's Supabase session for application writes. Do not include or use a Supabase `service_role` key in the app.
- Keep verification-only item details and claim evidence in records whose RLS prevents access by other students, finders, and report owners. Do not rely on hiding fields in the UI while exposing them through a selectable table.
- Keep reporter identity private in the database/API surface available to students; do not fetch it for student report views.
- Store item photos in a non-public bucket and authorize reads for authenticated campus users through Storage RLS. A public URL does not satisfy the signed-in-only visibility rule.
- Database constraints should preserve invariants such as one active claim per claimant/item, at most one active reservation per found item, one canonical custody record for duplicate notices, and valid state transitions, in addition to action-level Zod validation.
- Do not hardcode a campus email domain, pickup deadline, special-item taxonomy, or archive retention period while each is TBD.

## Acceptance criteria

1. **Pre-desk report:** Given a student submits a found notice before hand-in, authenticated students can see its safe summary and “not yet at desk” state; nobody can claim it; no linked lost report is resolved.
2. **Desk receipt:** When an admin confirms that notice has been received, the found item becomes claimable, and relevant students receive the configured actionable email without private proof details.
3. **Candidate matches:** Given one found item resembles several lost reports, admins can retain multiple candidate links. None is treated as ownership proof or resolved before handover.
4. **Private claim evidence:** A claimant and admins can read claim evidence; the finder, other report owners, and other students cannot, even by querying Supabase directly under an authenticated student session.
5. **Concurrent claims:** Multiple students can submit claims for one received item. Admins can request more information, approve one, and keep other claims pending until handover or reservation release.
6. **Retry and withdrawal:** A rejected claimant can submit a new preserved attempt. A claimant can withdraw before handover; the reservation is released only through admin-controlled review, not automatic approval of another claim.
7. **Handover:** Approval alone leaves the item reserved, not returned. After physical pickup, an admin records handover; the selected claim completes, the linked lost report resolves, and competing claims close.
8. **Lost report lifecycle:** A lost report stays open until owner withdrawal, completed linked handover, or an admin closure after contacting its owner and recording a reason. Time passing alone does not close it.
9. **Photo access:** A signed-in campus user can view item photos; an unauthenticated visitor cannot fetch them using a guessed or copied object URL.
10. **Role escalation:** A student cannot make themselves an admin or change another user's role. An existing admin can appoint another admin through an authorized action, and the appointment is attributable.
11. **Authorization boundary:** Forging a Server Action request or calling Supabase directly as a student cannot bypass RLS for admin operations, private details, other users' claims, or custody transitions.
12. **Input boundary:** Invalid or tampered Server Action input is rejected by server-side Zod validation before a write is attempted.
13. **Policy gaps:** Until the campus confirms the domain, holding deadline, special-item rules, and retention period, the app neither guesses nor silently applies a default for those policies.

## Open policy decisions

These are deliberately unresolved and must be supplied by the campus before the corresponding behavior is enabled:

- **Campus email domain(s):** TBD. Signup restricted to verified addresses on the approved list.
- **Pickup/holding deadline:** TBD. Admins follow campus policy; no automatic reservation expiry.
- **Special-item categories and handling:** TBD. Admin-controlled, policy-led process.
- **Disposition archive retention period:** TBD. Retain an admin-only record until the campus defines a period.
- **Email delivery provider and operational configuration:** TBD. The required notification events and privacy boundaries are defined above.

## Existing implementation to replace or revise

The current app has one `items` record shape for lost and found, one generic status, public item-image URLs, broad authenticated profile/item reads, claim visibility for item reporters, one claim row per student/item, and direct item status updates. It has no separate custody receipt, candidate-match relationship, private item details, claim clarification/retry history, reservation release, handover record, or disposition archive. These are gaps against this spec, not existing behavior to preserve.
