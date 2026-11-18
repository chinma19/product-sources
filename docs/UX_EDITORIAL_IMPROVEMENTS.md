# UX and editorial improvements — 18 November 2026

Development branch: `codex/approved-v1-implementation`. **Not deployed.** The existing private Site retains its earlier hosted version. No access, payment, entitlement, identity or deployment settings were changed.

## Implementation plan and scope

The pre-implementation plan was shared with the owner: contextual references first, then batch evidence management, editorial layout/navigation, then isolated regression tests. No methodology or content decisions were reopened.

| Area | Affected components | Approach |
|---|---|---|
| Previous answers | `client/discoveries.mjs`, `client/app.mjs` | Presentation-only dependency map, compact expandable answers, evidence thumbnails, source previews, edit-and-return links |
| Evidence workflow | `client/evidence-library.mjs`, `server/evidence.mjs`, Worker endpoints | Multi-select/drop queue, object-URL previews, per-image transfer progress, individual errors/retries, annotation/edit controls, guarded ordering and replacement |
| Editorial layout | `client/editorial.css` | Warm neutral typography, comparison cards, spectrums, colour swatches, customer-photo layouts, responsive density |
| Navigation | Application shell | Five direct chapter links, completion counts, collapsed long lists, current step and safe return navigation |
| Regression | `tests/ux.test.mjs`, existing suites | Synthetic accounts plus isolated read-only snapshots of existing saved data |

Draft 3 content, R1–R10, all 68 step routes, answer keys, synthesis/confirmation logic and PDF generation are unchanged. The existing recovery store remains authoritative for pending exercise responses. No customer record was reset or deleted.

## Additive migration

`drizzle/0002_evidence_display_order.sql` adds `display_order INTEGER NOT NULL DEFAULT 0`. The applied 0000/0001 migrations are unchanged. Existing image IDs, private object keys, annotation JSON, timestamps, sorting groups and response documents remain intact. Equal positions use creation time and ID as a stable fallback. New images append to the collection. A later approved hosting update must apply this migration before serving the new Worker; it is not applied to the live database by development or tests.

New endpoint `PATCH /api/evidence/order` accepts the complete owner-scoped ordered ID/revision list. One guarded SQL statement updates all positions together or rejects the operation if the library or any revision changed. It cannot partially reorder stale data or include another customer's records.

`PUT /api/evidence/:id/image` validates the replacement, writes a new private object, updates the matching owner/revision, then removes the superseded object. It keeps the item's ID, annotations, title, kind, inspiration group and position. Invalid/stale requests preserve the existing image. Upload retries use an idempotent upload ID to avoid duplicate items after a lost response. Existing single-file/link endpoints remain compatible.

## Customer experience

“Your discoveries so far” appears when relevant records exist, above the current response area. The dependency map covers Body, Personality, Lifestyle, Connect the Dots and final reference screens. Three relevant answers are shown initially; more answers and full long text are expandable. A small selection of relevant private evidence appears with saved captions/notes and links to review the full collection. These are recorded observations, not inferred style rules. Scale references show their endpoints and original seven-position meaning.

Edit links carry a validated return route. “Save & return to my exercise” saves pending response changes and restores the destination; offline edits remain in the existing encrypted recovery workflow. Derived values refresh when revisiting the destination, while deliberate overrides remain deliberate. Unsaved annotation drafts and link-reference forms remain in memory during in-app navigation and rerenders; closing the tab warns about pending work. Unlike exercise responses, unsaved image annotations, selected local files and link-form drafts are not restored after a full browser restart: use Save observations or Upload selected images before closing. This distinction is not presented as server persistence.

Images can be selected together or dropped on desktop. Each preview has a title, status/progress and its own retry/removal action. Transfers run sequentially to bound memory/network use; one failed image does not block later images. The queue survives in-app navigation, preserves its selected evidence set and revokes local object URLs after use. Existing images expose independent observation, move earlier/later, replacement and deletion controls. Ordering controls are keyboard/touch alternatives to drag gestures. The existing JPG/PNG/WebP, 8 MB and 40-item limits remain.

The five chapters have direct links and individual completion counts. Detailed lists start collapsed, retain all step links and can be expanded. Desktop headings, padding and image sizes are reduced; original illustrations are expandable, and full approved guidance remains available. Customer photos personalise the welcome screen and evidence/context grids without external photo dependencies. Mobile rules use stacked editors, touch-size controls and 16px response inputs. A rendering bug where a saved first spectrum position (0) appeared unselected was fixed without changing its stored value.

## Data safety and verification

The live database was read only to obtain a bounded snapshot: one workbook with 16 answer entries and 35 completed steps, plus 20 evidence metadata records. Customer identities were replaced with test-only aliases; private values were kept outside the Git repository. No uploaded image bytes were downloaded or copied. Tests use independent Miniflare databases and synthetic accounts; all edits, replacements and deletions occur only in those isolated databases.

The migration test verifies that response rows are unchanged and all previous evidence columns remain identical. The actual Worker resumes the saved-data copy, retains all answers/completion, saves an isolated edit without losing unrelated answers, returns the evidence references and generates PDF bytes. All 68 contextual screens are rendered against that copy without mutating its answers. This tests existing metadata and saved responses, not physical rendering of those customers' original image files.

See `UX_TEST_REPORT.md` for the final run and exact remaining browser checks. Managed browser controls are unavailable in this session. No browser preview server, replacement browser installation or deployment was used to work around that limitation.
