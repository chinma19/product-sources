# UX/editorial regression report — 18 November 2026

Status: **implemented and tested on the development branch; not deployed**.

## Results

- Production Worker build: PASS.
- Automated tests: **27 passed, 0 failed, 0 skipped** in this workspace.
- Existing saved-data snapshot: one workbook, 16 answer entries, 35 completed steps and 20 evidence metadata records. Additive migration preserves previous columns/documents; actual Worker resume, isolated edit/save, answer retention, evidence references, all 68 contextual screens and direct PDF generation pass.
- Synthetic coverage: multi-select queue/preview, per-file failure and retry, upload idempotency after lost response, annotation persistence, atomic order/reload, stale revisions, cross-account denial, safe image replacement, source escaping, spectrum position 0, edit-and-return, downstream updates and collapsed chapter lists.
- Existing full-journey suite passes: all 68 steps, save/resume/edit, completion, self-confirmed synthesis, downstream overrides, recovery encryption/conflicts, account isolation, Compass questions/bands and independent reset, actual PDF exports and overflow errors.
- Final PDF checks: three fixture PDFs, five pages rendered; embedded fonts, complete heading glyphs, text bounds and one-page limit pass. The PDF layout implementation is unchanged.
- Read-only live integrity check after testing: progress row and all 20 evidence rows match the initial snapshot exactly. The live schema still has no new order column. Hosted version remains 2, owner-private, with no groups or external visitors.
- Source/hosting preservation: no changes to manuscript sources, `content/workbook.json`, existing migrations 0000/0001, `.openai/hosting.json`, PDF logic or the recovery store. No live data writes, deployment or payment/access changes.

Private test snapshots and derived customer data are outside Git. Tests skip the existing-data check explicitly if that private snapshot is unavailable; they do not pretend synthetic data is real customer data. Original customer image bytes were not downloaded: existing-image checks cover retained metadata, references and URLs; file persistence/replacement use synthetic image bytes in isolated private R2.

## Remaining real-browser verification

Browser-control/preview tools are not exposed in this environment. DOM integration does not verify actual layout, touch behaviour or operating-system dialogs. These items remain NOT TESTED on the new implementation:

| Browser check | Acceptance |
|---|---|
| Mobile Safari/Chrome at 360–430px and landscape | No sideways scrolling, clipped content or obscured actions; usable menus/chapters, controls, keyboard and colour picker |
| Desktop responsive layout | Appropriate reading width, compact navigation, intact comparison cards and customer-photo grids |
| Native batch picker and desktop drop | Multiple actual files preview correctly; per-image progress, partial failures, retry and cleanup remain understandable |
| Hosted sign-in and two-device persistence | Authenticate through the existing Sites gateway; save and resume without record loss |
| Actual uploaded photos | Original customer photos load with correct orientation/contain sizing and useful annotations |
| Native PDF/PNG download handoff | Files save/open on desktop and phone; full/one-page PDFs remain readable |
| Complete browser journey | Previous answers/images are useful, edit-and-return preserves context, deliberate overrides remain intentional, unconfirmed patterns/wording stay out of final results |
| Assistive technology | Keyboard/focus flow and screen-reader announcements for queue, errors and chapter controls are understandable |

The hosted URL still serves the earlier version. These browser checks on the new version require an approved private staging/deployment path; none was enabled. The additive migration must be applied before serving the new Worker during that future approved update. See [implementation/migration notes](UX_EDITORIAL_IMPROVEMENTS.md).

## Reproduce automated checks

```sh
npm ci --cache .npm-cache
npm run build
npm test
python scripts/check_pdf_exports.py
```

The PDF renderer check requires PyMuPDF. Tests use separate local Miniflare databases; never point them at live D1. Full private snapshot checks also require the local read-only fixture outside the repository.

## Final automated output

```text
> in-her-fashion-blueprint@1.1.0 test
> node --test tests/*.test.mjs

✔ all 68 approved pages and source wording are accounted for (5066.880645ms)
✔ anonymous API requests are rejected; identity is never stored in browser data (31.803078ms)
✔ all 68 source steps complete, persist, reopen, and remain editable (743.147915ms)
✔ recorded answers carry forward without generated style claims; overrides stay deliberate (1.25844ms)
✔ private responses, exports, and optimistic concurrency isolate accounts (32.726528ms)
✔ time map totals and Compass bands follow the manuscript (17.978969ms)
✔ private evidence upload, image retrieval, sorting, deletion, and validation (109.650681ms)
✔ every client route renders, saves an entry, returns to it, and shows final transfers (3829.940608ms)
✔ durable progress survives a Worker restart and export stays complete (974.61559ms)
✔ future purchase-verification boundary blocks accounts without explicit entitlement (900.697865ms)
✔ approved amendments remain optional and preserve locked Compass content (0.735849ms)
✔ legacy answers survive migration and spectrum positions retain their meaning (66.173214ms)
✔ evidence annotations are editable, versioned, private and limited to approved observations (55.355101ms)
✔ the final Blueprint has an owner-specific direct PDF and no empty-field placeholders (1260.724188ms)
✔ customer completes the UI journey, confirms synthesis, returns later, exports PDF, and reuses Compass (2366.042344ms)
✔ only literal positive cross-part patterns become candidates; admiration alone is excluded (2.301458ms)
✔ assembled draft is deterministic, exposes missing slots, and never writes a final answer (0.499378ms)
✔ recovery ciphertext is account-isolated, tamper-resistant, and handles large drafts (81.929348ms)
✔ failed save survives closing/reopening the store and clears recovery after a successful retry (40.417593ms)
✔ stale recovery requires an explicit choice and preserves newer unrelated server answers (3.922963ms)
✔ context references show relevant literal answers, scale endpoints, selected evidence and safe edit-return links (2022.262895ms)
✔ batch queue previews multiple files, rejects invalid files, isolates errors and retries only failed images (3.439308ms)
✔ retrying an upload after a lost response returns the same private evidence item (161.655632ms)
✔ evidence ordering persists atomically, isolates customers, rejects stale/duplicate orders and leaves annotations unchanged (107.386218ms)
✔ replacing an image keeps its ID, annotations, group, order and other customer records (212.574932ms)
✔ the additive order migration preserves an isolated copy of existing saved customer data (1753.994267ms)
✔ customer selects multiple images, saves annotations, reorders, replaces and revisits contextual answers in the UI (710.895788ms)
ℹ tests 27
ℹ suites 0
ℹ pass 27
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 52249.26734
```

```text
blueprint: 2 pages; embedded fonts, heading glyphs and bounds verified; rendered all pages
one-glance: 1 pages; embedded fonts, heading glyphs and bounds verified; rendered all pages
full-ui-journey: 2 pages; embedded fonts, heading glyphs and bounds verified; rendered all pages
```
