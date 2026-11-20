# Partial-completion guidance correction — 20 November 2026

Owner approved only the four guidance gaps found by the dedicated partial-completion scenario. This release changes client rendering/help and its tests. It does not change answer resolution, synthesis, customer-confirmation logic, approved manuscript wording, persistence, API behaviour, PDF generation, access, payments, schema or hosting configuration.

## Changes

- Missing fields remain visible within partially populated Master sections.
- Style language shows all nine approved rows and both columns, with specific source links for unanswered cells. Profiles remain valid sources, including deliberately edited profiles; clothing descriptions link to the relevant translation/dictionary/synthesis exercises.
- All six colour roles are shown. Recorded colours remain unchanged, and each unrecorded role has its own source link. This also applies to the linked One-Glance colour reference and an entirely absent formula.
- Missing discovery information, genuinely new Part 5 decisions and optional reflections/checks have distinct concise guidance. The original exercise labels and instructional text are unchanged. Missing information is not automatically filled or inferred.

`client/blueprint-guidance.mjs` is a presentation-only helper used by `client/blueprint-view.mjs`. Display-only messages carry `data-blueprint-guidance`; they are never copied into customer responses or server Blueprint values. The direct PDF path is unchanged and still uses completed customer content only. Skipping, partial export and deliberate overrides remain available; no new completion requirement or score has been introduced.

No database migration or customer-record rewrite is required. The existing owner-private preview is the only publication target authorised for this change.

## Verification

**84 automated tests passed; 0 failures; 0 skipped.** This includes all 76 previous regressions and eight added tests. The exact partial-completion journey now passes **38/38 checkpoints**, retaining all original 26 checks (including the four previously failing guidance checks) and adding targeted source/data/PDF assertions.

The synthetic customer records answers in all four discovery parts while leaving other exercises unanswered, then views Master and One-Glance. The test verifies missing guidance, makes deliberate final edits and confirms wording, completes missing earlier exercises, saves/resumes and downloads initial/updated full and One-Glance PDFs. Earlier completions remain unchanged and status stays IN_PROGRESS. Each One-Glance remains one page. Actual PDF text checks were available and verified customer wording is retained and display guidance is absent.

All tests use independent local Miniflare databases or in-memory synthetic responses. No test writes to the hosted workbook or customer evidence. The older saved-data compatibility fixture remains outside Git and is used only in an isolated database.

These are automated DOM/API/PDF checks, not real-browser layout or native-device checks. No browser-control tool is available in this session. No browser visual pass is claimed.

## Reproduction

```sh
npm run build
npm test
node --test tests/blueprint-guidance.test.mjs tests/partial-completion.test.mjs
```

Generated synthetic test PDFs and the detailed journey results are under ignored `test-results/partial-completion/`. PyMuPDF enabled the PDF text checks in this run; the tests explicitly report its absence in other environments.

## Dedicated journey

```json
{
  "passed": 38,
  "failed": 0,
  "pdfTextChecksAvailable": true,
  "initial": {
    "answeredKeys": 10,
    "completed": [
      10,
      39
    ],
    "lastStep": 54
  },
  "final": {
    "answeredKeys": 21,
    "completed": [
      10,
      39
    ],
    "status": "IN_PROGRESS"
  }
}
```

## Full regression output

```text
> in-her-fashion-blueprint@1.1.0 test
> node --test tests/*.test.mjs

✔ 10 recent images selected together are previewed, uploaded and privately persisted (3155.215432ms)
✔ 12 recent images selected together are previewed, uploaded and privately persisted (582.973723ms)
✔ 10 inspiration images selected together are previewed, uploaded and privately persisted (318.234376ms)
✔ 12 inspiration images selected together are previewed, uploaded and privately persisted (416.762874ms)
✔ 12 recent plus 12 inspiration photos retain their selected sets and existing observations (514.650947ms)
✔ 12-image recent batch continues after a lost response and retry creates no duplicate (257.985511ms)
✔ 12-image inspiration batch continues after a lost response and retry creates no duplicate (215.734604ms)
✔ removing a waiting image prevents its upload and newly selected photos await their own upload action (1.689154ms)
✔ capacity failures are explicit for each image without discarding existing or queued photos (0.817321ms)
✔ the application accepts one 12-file picker selection for each evidence set and saves all 24 privately (3265.594872ms)
✔ missing identity remains identifiable inside an otherwise populated Master section (74.591307ms)
✔ partial style-language guidance retains nine rows and all eighteen cells with specific sources (62.32639ms)
✔ one recorded colour retains guidance for the five other formula roles and targets their original exercise (75.648508ms)
✔ guidance distinguishes genuinely new final decisions, missing discovery responses and optional reflections (127.516831ms)
✔ rendered completion help never mutates answers, response metadata or PDF section values (28.11594ms)
✔ partial PDF keeps exact supplied words while excluding display-only completion guidance (686.387758ms)
✔ a completely absent colour formula exposes all six missing roles in Master and One-glance (30.21268ms)
✔ final output is a populated readable reference, with controls only after explicit edit (124.971092ms)
✔ page labels remain approved, missing information has source links and no blank response inputs (6.55278ms)
✔ website sections and profile outputs respect linked and overridden binding metadata (3.606343ms)
✔ the complete ten-field One-Glance PDF is measured into one readable page and full output paginates (693.88421ms)
✔ moderate complete source responses populate all ten One-Glance fields and fit without summary overrides (162.940087ms)
✔ overlong One-Glance content is never silently truncated or shrunk below legible type (3004.660774ms)
✔ all 68 approved pages and source wording are accounted for (1417.430746ms)
✔ anonymous API requests are rejected; identity is never stored in browser data (50.668672ms)
✔ all 68 source steps complete, persist, reopen, and remain editable (849.501526ms)
✔ recorded answers carry forward without generated style claims; overrides stay deliberate (3.35445ms)
✔ private responses, exports, and optimistic concurrency isolate accounts (34.207291ms)
✔ time map totals and Compass bands follow the manuscript (14.019867ms)
✔ private evidence upload, image retrieval, sorting, deletion, and validation (95.077152ms)
✔ every client route renders, saves an entry, returns to it, and shows final transfers (3793.919261ms)
✔ durable progress survives a Worker restart and export stays complete (4309.923415ms)
✔ future purchase-verification boundary blocks accounts without explicit entitlement (1204.529541ms)
✔ approved amendments remain optional and preserve locked Compass content (0.562537ms)
✔ legacy answers survive migration and spectrum positions retain their meaning (94.254036ms)
✔ evidence annotations are editable, versioned, private and limited to approved observations (103.496089ms)
✔ the final Blueprint has an owner-specific direct PDF and no empty-field placeholders (1568.105284ms)
✔ customer completes the UI journey, confirms synthesis, returns later, exports PDF, and reuses Compass (2515.493241ms)
✔ Part5 displays linked discoveries, updates immediately, keeps sparse edits and confirms concise summaries (8195.652679ms)
✔ legacy final values are preserved, explicitly reviewed or linked, and can be restored from their retained version (1581.349057ms)
✔ new Part5 reflections reuse exact saved words with deterministic ordered fallbacks (3.405926ms)
✔ Part4 dictionary and translation wording reaches meaning and clothing references without assigning an aesthetic (1.969069ms)
✔ editing one cell leaves every unedited derived cell live (2.068829ms)
✔ migration retains ambiguous stored tables and marks them for legacy review (1.275044ms)
✔ relinking fields or individual cells preserves raw kept values and restores future updates (1.002415ms)
✔ full table relinking then editing one cell never revives old cached sibling values (0.394119ms)
✔ confirmed brief uses resolved lifestyle and exposes exact source snapshots (0.546817ms)
✔ upstream edits flag confirmed wording without changing it or losing a deliberate final identity (1.579462ms)
✔ rules draft retains all rules and consideration wording; saved legacy summaries are not overwritten (0.75779ms)
✔ One-glance clothing and outfit directions use readable labels rather than serialized cell keys (0.994376ms)
✔ backup binding metadata restores linked and confirmed states after explicit validated import (1.263178ms)
✔ pending summaries are valid saved controls but never implicitly resolve into final content (0.495602ms)
✔ linked fields without stored answers and resolved snapshot shapes survive a full JSON backup round trip (0.448902ms)
✔ the confirmation-click snapshot is preserved across queued source edits and later manual wording edits (0.641152ms)
✔ negative goals and admired inspiration are not relabelled as final permissions or wanted repeats (0.137931ms)
✔ reviewing remaining legacy cells preserves earlier explicit links and deliberate overrides (1.052722ms)
✔ One-glance shopping filter keeps row labels and exact responses without repeated column metadata (1.085577ms)
Partial-completion checkpoints: 38 passed, 0 failed; PDF text checks available.
✔ version3 exact partial discovery → final references → later missing exercises → preserved decisions → PDF (9855.757192ms)
✔ binding and confirmation metadata save and resume without silently rewriting confirmed wording (72.704782ms)
✔ legacy review preserves stored values and explicit relinking survives save/resume and later upstream edits (17.466493ms)
✔ editing one table cell saves sparse overrides while unedited cells continue to inherit (2.072014ms)
✔ encrypted recovery restores link, per-cell review and confirmation operations after a failed save (8.479274ms)
✔ answers edited during an in-flight save survive its older response and receive their own revision (6.425885ms)
✔ a failed in-flight field relink cannot override a later deliberate edit on retry or recovery (8.158185ms)
✔ a failed in-flight cell relink cannot override a later deliberate edit on retry or recovery (7.444965ms)
✔ recovery preserves the confirmation-time sources when a source changes before a failed save (7.007741ms)
✔ saving a confirmation with a later unsaved source edit retains the original confirmation snapshot (1.095077ms)
✔ failed whole-table relinking retains live inheritance for unedited cells when a later cell is overridden (9.109849ms)
✔ failed legacy review followed by one cell edit preserves the review decision for the remaining cells (9.803335ms)
✔ same-pending whole-table link then cell edit saves and resumes without losing other values or binding decisions (8.158687ms)
✔ same-pending individual reset then cell edit saves and resumes without losing other values or binding decisions (7.31411ms)
✔ same-pending legacy review then cell edit saves and resumes without losing other values or binding decisions (9.038352ms)
✔ only literal positive cross-part patterns become candidates; admiration alone is excluded (2.195158ms)
✔ assembled draft is deterministic, exposes missing slots, and never writes a final answer (1.310654ms)
✔ recovery ciphertext is account-isolated, tamper-resistant, and handles large drafts (76.188893ms)
✔ failed save survives closing/reopening the store and clears recovery after a successful retry (32.581726ms)
✔ stale recovery requires an explicit choice and preserves newer unrelated server answers (2.436059ms)
✔ context references show relevant literal answers, scale endpoints, selected evidence and safe edit-return links (5735.703496ms)
✔ batch queue previews multiple files, rejects invalid files, isolates errors and retries only failed images (2.666134ms)
✔ retrying an upload after a lost response returns the same private evidence item (159.441407ms)
✔ evidence ordering persists atomically, isolates customers, rejects stale/duplicate orders and leaves annotations unchanged (73.109367ms)
✔ replacing an image keeps its ID, annotations, group, order and other customer records (141.973755ms)
✔ the additive order migration preserves an isolated copy of existing saved customer data (4664.691241ms)
✔ customer selects multiple images, saves annotations, reorders, replaces and revisits contextual answers in the UI (670.393985ms)
ℹ tests 84
ℹ suites 0
ℹ pass 84
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 127390.398125
```
