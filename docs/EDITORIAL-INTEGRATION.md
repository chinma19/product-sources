# Editorial integration — acceptance report

This report describes the initial editorial integration. The later owner-approved selection corrections are recorded in [SELECTION-CONTROL-CORRECTIONS.md](SELECTION-CONTROL-CORRECTIONS.md).

Branch: `codex/editorial-integration`, based on version 4 and the approved editorial prototype at `4fc6a0b`. This branch is for owner-private acceptance testing. The current version 4 Site is not replaced or updated.

## Implementation

- The actual authenticated application now uses the approved editorial typography, warm-neutral palette, compact reading widths, chapter overview, progress indicators and responsive navigation.
- All 68 source pages have continuous editorial layouts with original guidance interleaved with their existing interactions. Section jumps follow each page's actual source headings rather than imposing a four-stage template. See [SOURCE-TO-EDITORIAL.md](SOURCE-TO-EDITORIAL.md) for the full page ledger.
- Existing control types remain functional: selections, matrices, seven-position spectrums, written reflections, time allocation, colour roles, dictionaries, translation tables, outfit records, synthesis confirmation and the independent 25-point Style Compass.
- Customers' private API image URLs populate galleries and reference covers. Collections stay separate. Relevant galleries show all saved images; the 40-item library limit remains. Photo drawers provide literal saved annotations and focused inspection while retaining the exercise beneath them. Page 52 requires a deliberate collection/outfit choice rather than automatically displaying or selecting both sets.
- Contextual earlier-answer panels retain edit-and-return links. Part 4 uses recorded responses and explicit customer confirmation. Final results preserve inherited sources, sparse deliberate edits, ambiguous saved values, confirmed wording and partial-completion guidance.
- Master and One-Glance are readable result presentations with focused editing. Mobile One-Glance statement text retains the approved compact size. Existing direct PDF, print/image exports, answer backup/restore, account isolation and encrypted browser recovery remain available.

There are no changes to the scoring/model, synthesis engine, PDF implementation, Worker API, ProgressStore/recovery implementation, approved workbook data, version 4 hosting manifest or immutable migrations. No image analysis or invented style conclusions are introduced.

## Staged verification

The first stage verified the real chapter overview, step 12, Master/One-Glance and a read-only existing saved-record snapshot before the broader journey tests. The new suite uses the actual Worker, D1/R2 test bindings, authenticated gateway fixtures and actual ProgressStore; no prototype persistence or fake progress is substituted.

The full journey then verifies all 68 routes, saving/resuming after a new session, source edits, dependent results, deliberate overrides, customer-confirmed wording, partial results, direct PDF generation, independent Compass use, 12-photo batches in each collection, all 40 relevant photos, owner authorization and unrelated-account isolation. The private saved-data snapshot stays outside the repository and is never published; tests compare hashes without printing its responses.

The source ledger accounts for 1,694 original source lines and all 372 existing control anchors: 371 interactive placements and one preserved legacy-artifact slot. The page-23 table-parser artifact is not presented as a new pipe-valued checkbox question. Any previously stored value remains available read-only and is preserved by the model and backup. Page 52's existing checkbox and written reflection remain unchanged.

Three earlier regression tests were adapted to the approved presentation: an active collection contains its own images; final editors live in a portal rather than inside result cards; and chapter navigation has five chapters plus separate preparation. Their persistence, PDF, partial-completion and data assertions remain intact.

**Final verification:** production build passed; all **115 automated tests passed**, with zero failures and zero skips. This includes 84 existing product regressions, 20 approved-prototype checks and 11 authenticated editorial-integration cases. The dedicated partial-completion scenario passed all 38 checkpoints, including PDF text checks. Original saved-snapshot hashes and copied answer/evidence records remained unchanged. Final quality edits refresh the cover immediately; unsaved annotation drafts survive closing/reopening, and saved summaries update only after explicit Save. Hosted preview details are supplied in the delivery message after deployment succeeds.

## Acceptance preview and data boundary

The integration preview is a separate owner-private Site with its own D1 database and R2 bucket. It uses the same application authentication and save/export endpoints as the product. It does not share or copy the live version 4 database, photo objects or account IDs. Sites identity is scoped to each Site, so the same ChatGPT account begins with a separate private workbook here.

No customer records are embedded in the preview sources or seeded automatically. To test with a copy of existing answers, export an answer backup from version 4 and use **My Blueprint → Restore answers** in this preview. The existing confirmation explains that matching answers in the preview will be replaced. This does not modify version 4. Photo bytes are not copied by an answer backup; upload test images separately to the preview's private library.

## Desktop and mobile acceptance checklist

1. Sign in with the owner ChatGPT account on desktop and phone. Complete a few steps, leave, and resume in the same or another browser to verify server persistence.
2. Review representative reading pages, choice cards, matrices, spectrums, the time map, colour selectors, dictionary and structured outfit records at 360px, 390px, 430px, tablet and desktop widths.
3. Select 10–12 sample photos in one operation for each collection. Inspect every relevant image from an exercise and from its drawer; edit annotations, return to the question, reorder or replace an image, and confirm saved records remain.
4. Review and revise earlier responses, return to the current exercise and inspect updated contextual panels.
5. Preview and confirm Part 4 wording. Open partially completed Part 5; inspect missing-source guidance, inherited values and genuinely new decisions. Make a deliberate final edit and confirm it survives an upstream change.
6. Inspect Master and One-Glance, export both PDFs, and use the Compass independently without clearing journey progress.

Automated DOM/API tests establish functionality but do not establish physical browser geometry, touch behaviour, OS file-picker behaviour or download handoff. This chat does not expose desktop/browser control. Under the [Sites skill](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md), “If `cua_repl.js` is unavailable, skip browser QA.” Native desktop/mobile visual checks remain acceptance work; no browser pass is claimed.

Do not merge or deploy this branch to the version 4 Site until the owner explicitly approves the integrated product after acceptance testing.

## Published acceptance environment

- URL: **https://inherfashion-integration-review.fabulousloon.chatgpt.site**
- Site: `appgprj_6b057ae4ed348191af2e0da0149f781d`, independent version **1**.
- Application source commit: `a715804cd7e3009d4d2d6e1dff64312947933ab0`.
- Published deployment-source commit: `dbba39563773f64d9fcce618820fdaae4e9d44e0` in the separate Site source repository.
- Access verified: one allowed owner, zero groups and zero external visitors. Unauthenticated HTTP request returned **401**.
- The new `DB` binding contains `progress`, `evidence` and `entitlements`. The Worker uses the separate Site's `BUCKET` binding for private photo objects. No customer records were seeded or copied.
- Native publication succeeded. The existing version 4 Site remains on version **4**, with access-policy revision **1** unchanged.
- No automatic expiry is configured for this acceptance Site.

Use the same owner ChatGPT account. A fresh workbook here is expected because Site identity and storage are separate. Complete test exercises or restore a copy of your answers through **My Blueprint → Restore answers**; upload test photos separately. Do not use acceptance testing as approval to replace version 4. The owner must explicitly approve the integrated release first.
