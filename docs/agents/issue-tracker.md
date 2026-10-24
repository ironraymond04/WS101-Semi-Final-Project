# Issue tracker: Local Markdown

Issues and specs for this project live in `.scratch/`.

- Keep each feature's spec at `.scratch/<feature>/spec.md`.
- Store implementation tickets individually at `.scratch/<feature>/issues/<NN>-<slug>.md`, numbered from `01`.
- Put a `Status:` line near the top of each ticket. Add discussion under `## Comments`.
- When publishing an issue or spec, create the appropriate file under `.scratch/<feature>/`.
- When asked to fetch a ticket, read the referenced file or path.

For wayfinding, use `.scratch/<effort>/map.md` as the decision map and one numbered file per child ticket in `issues/`. A ticket may include `Type:`, `Status:`, and `Blocked by:` metadata. It is unblocked once every referenced ticket is resolved. Claim it before starting work, then record the answer, mark it resolved, and add a short pointer to the map.
