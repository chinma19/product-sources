# Selection-control audit — for approval

Date: 25 November 2026. Application reviewed: `codex/editorial-integration`, application baseline `c52b3845d85777d87a2b2e265341e67e3bf564ca`.

**The Step 38 defect is confirmed. Six questions have clear single-answer intent but use independent checkboxes. No corrections have been implemented.** This is an audit of selection accuracy, not a design revision.

## Scope and authority

All 68 manuscript steps were compared with the current exercise definitions and interaction code. Draft 3 wording, the approved R1–R10 resolutions and the approved editorial integration remain authoritative. The v1.0 Product and Engineering specifications were consulted; the latter explicitly distinguishes `single_select` and `multi_select` response types. Neither specification supplies a field-by-field cardinality override for the ambiguous Draft 3 questions below.

Coverage comprises 372 page-local controls using 342 canonical IDs. Shared IDs intentionally carry answers into later steps. The categorical inventory contains 38 checkbox groups, 10 matrices (90 rows), 12 preference axes and one existing single-select Compass decision: 61 control definitions, of which one checkbox artifact is already retired from interaction. Image sorting, image annotations, numerical allocation/scoring and written-list capacities were also checked. The companion [68-step inventory](SELECTION-CONTROL-INVENTORY.json) records every step, including steps without categorical choices.

No application, manuscript, schema, customer record, photograph, account, payment, access policy or hosted deployment was changed. Documentation is the only repository change in this audit.

## A. Six clear corrections proposed

Each question should allow one current answer, or remain unanswered during partial completion. Selecting another option should immediately replace the prior answer. This does not introduce a mandatory completion requirement.

| Step | Field | Approved question / cue | Existing options |
| --- | --- | --- | --- |
| 26 — Your Visual Intensity | `p26.choices1` | “WHICH FEELS CLOSEST?” / “MY NATURAL LEVEL” | 1; 2; 3; 4; It changes depending on the occasion |
| 38 — Read Your Time Map | `p38.choices1` | “If you looked at your wardrobe without knowing anything about you, would it reflect this time map?” | Yes; Mostly; Not really |
| 45 — Connect the Dots | `p45.choices1` | “Do these three things seem to agree?” | Mostly yes; Somewhat; Not really |
| 49 — Style Balance | `p49.choices1` | “If an outfit contains your core qualities, but none of your accents, can it still feel like you?” | Yes; No; Sometimes |
| 52 — Looking Like Me: BODY | `p52.choices1` | “Does it work with the physical qualities I discovered?” | Yes; Somewhat; No |
| 52 — Looking Like Me: LIFESTYLE | `p52.choices2` | “Would this make sense for my actual life?” | Sometimes; Not really |

Step 52 really has only the two listed Lifestyle options in Draft 3. The proposed correction preserves them. Adding “Yes,” or removing the separate written Lifestyle reflection, would be a content change and is not proposed here.

## B. Six overlapping cases requiring owner review

These remain multiple-select in the current application. Multiple answers here are not automatically evidence of corrupt or conflicting saved data. **Recommendation: retain their current multiple-selection behaviour unless the owner explicitly approves a narrower interpretation.** Do not implement a blanket single-select rule from a singular heading alone.

| Step / field | Why the intended cardinality is less certain | Proposed decision for review |
| --- | --- | --- |
| 19 — `p19.choices2`, “I prefer shoes that are:” | Comfort, practicality, aesthetics and occasion are different dimensions. “Very comfortable” and “Mostly practical” can both be true. | Keep multiple selection. |
| 26 — `p26.choices2`, “What is usually the easiest way for you to add interest?” | “The easiest way” suggests a primary method, but colour, jewellery, texture and other methods can coexist; there is no one-answer instruction. | Keep multiple selection, unless one primary method was intended. |
| 30 — `colour.practical`, “Is this colour:” | “Easy to integrate” / “Usable with some effort” concern integration; “Mostly an accent” concerns role. These dimensions overlap. | Keep multiple selection; do not silently make accent and integration mutually exclusive. |
| 40 — `p40.choices3`, ENVIRONMENT | “Mostly indoors,” “Mixed indoor/outdoor” and “Air-conditioned spaces” overlap. Some headline qualifiers could look contradictory when read as one universal context. | Keep multiple selection across real-life contexts; no exclusive subgroup without approval. |
| 40 — `p40.choices4`, DRESS EXPECTATIONS | Casual, professional, modest and formal requirements can apply to different parts of the same life; “Highly variable” can accompany them. | Keep multiple selection; no inferred exclusive subgroup. |
| 61 — `colour.result`, RESULT | The first two options describe ease of integration. “I love it, but it doesn't need to become a major wardrobe colour” can also be true of an easily integrated colour. A single overall result is plausible, but not unambiguous. | Keep multiple selection pending an explicit decision between one overall result and all applicable assessments. |

The full literal option sets are retained in the companion inventory. No wording, options or dimensions have been rewritten to resolve these ambiguities.

## C. Twenty-five legitimate multiple-select groups to preserve

| Steps | Fields / purpose |
| --- | --- |
| 6 | `p6.choices1` preparation checklist |
| 9 | `p9.choices1–2` comfortable fit range and disliked fit qualities; the source explicitly says the goal is not one correct fit |
| 12 | `p12.choices1–2` recurring silhouette descriptions and preferences |
| 14 | `p14.choices1–4` tops, bottoms, sleeves, dresses/skirts; different garments and contexts can have different preferred lengths |
| 16 | `p16.choices1` neckline qualities |
| 19 | `p19.choices1` clothing discomforts; “CHECK ANY THAT APPLY” |
| 23 | `p23.choices1–5` silhouette, colour, texture, detail and overall feeling in inspiration |
| 31 | `p31.choices1–5` jewellery, accessories, shoes, styling details and clothing details |
| 36 | `p36.choices1` real dressing contexts; explicitly “SELECT ALL THAT APPLY” |
| 40 | `p40.choices1–2` weather and movement needs |
| 42 | `p42.choices1` familiar wardrobe/lifestyle mismatches |

The remaining checkbox definition, `p23.choices6`, is a parsed table-separator artifact (`|`, `|`, empty). Its interactive control was already retired during editorial integration; any historical answer is displayed read-only. The real `inspiration.want` matrix provides the approved choices. Preserve the old ID and any stored value; this audit proposes no deletion or new control.

The 10 matrices already store one value per row. The 12 preference axes already select one position per axis. The current `compass.decision` is a single-select with scalar storage; retain that design. Image sorting assigns one category per image, and optional evidence annotations use single dropdowns for fit/reaction/exposure and multi-value observation tags. These do not need checkbox conversion. The legacy `p66.choices1` array remains in the compatibility model: a historical multi-answer Compass decision must also be preserved for review, not reduced arbitrarily.

## D. Selection limits and numeric requirements

No approved checkbox question says “up to three,” “choose exactly three” or another numeric checkbox cap. The numeric cues apply to separate written lists and structured records. In particular, Step 36's top-three summary must not become a three-option cap on its select-all checklist.

| Steps | Requirement | Current implementation / proposal |
| --- | --- | --- |
| 5, 21–24 | 8–12 recent outfits; 10–15 inspiration references | Collection guidance, with the existing application's 40-item total library limit; not limits on checked preferences. Preserve. |
| 23 | Five recurring inspiration qualities | Five written slots. Preserve. |
| 25 | Three strongest visual characteristics | Three slots in the optional approved R4 addition. Preserve its optional status. |
| 30, 61 | A colour works with **at least three** existing items | Three example slots; not a maximum of three compatible wardrobe items and not a compulsory buying threshold. Preserve the colour exception. |
| 32, 62 | Top three style signatures | Three written slots, plus the separately authored one-signature priority. Preserve. |
| 34 | Choose 3–5 visual qualities | Five slots; maximum capacity is enforced, but a minimum of three nonblank entries is not enforced. |
| 36, 39 | Three main dressing contexts / three clothing needs | Three written slots; separate from unrestricted checklists. Preserve. |
| 46 | 5–8 Repeated Yeses, then three strongest | Eight and three written slots; minimum five nonblank Yeses is not enforced. |
| 47, 63 | Three pattern records / three outfit directions | Three structured records. Preserve. |
| 49, 56, 57, 59, 67 | Three core/final qualities | Three written slots using shared IDs where appropriate. Preserve. |
| 29, 61, 67 | Six named colour roles | Six roles, explicitly not a six-colour wardrobe restriction. Preserve. |
| 37 | Time-map total exactly 100 | Already checked before completing that step. Preserve partial saving. |
| 66 | Five scores of 0–5; total 0–25 | Existing bounds and interpretation bands retained, including intentional colour exceptions. |

Written-list validation checks array capacity, while allowing unfinished blank entries. It does not check a required number of nonblank or distinct entries. This supports partial completion. If extra guidance is approved, show a concise filled-entry count for explicit ranges such as 3–5 and 5–8; do not block autosave, invent answers, or add new completion requirements.

Existing capacities without an explicit manuscript maximum are three Supporting and Accent qualities, five deliberate signatures, and five “less of this” rules. They are not evidence for new checkbox caps or a request to expand this release.

## E. Cause, persistence and downstream effects

The importer assigns the same `checks` type to every checkbox group. The client renders independent checkboxes and adds each newly checked option to a Set. The validator accepts an array of any listed options up to the option-count length. It has no per-question single-answer rule and also accepts repeated identical values in externally supplied arrays.

Consequently, this is not only a temporary visual state: contradictory options can be saved and reopened. Ordinary saves preserve the complete array. The defect is shared by the six questions in section A.

| Field | Contextual references that currently read the answer | Direct automatic synthesis / final binding |
| --- | --- | --- |
| `p26.choices1` | Step 27 | None |
| `p38.choices1` | Steps 39, 42 | None |
| `p45.choices1` | None | None |
| `p49.choices1` | Steps 50, 51, 52, 56 | None |
| `p52.choices1–2` | Step 53 | None |

These six assessments do not directly feed the automatic repeated-pattern candidates or automatically populate a final identity field. Customer-written profiles and confirmed synthesis are separate inputs. A correction should update the contextual selections where referenced, retain the existing synthesis rules, and leave confirmed wording and deliberate Blueprint overrides untouched. It should not invent new automatic links into the final Blueprint.

Some legitimate or ambiguous multi-select groups do feed literal candidate patterns (`p19`, `p40`, for example). Their behaviour must not be narrowed accidentally. `colour.practical` is referenced at Step 61; `colour.result` is referenced at Steps 66–67 and appears in the relevant final colour material. These are reasons to resolve their intended semantics explicitly before altering them.

## F. Read-only saved-response inspection

The supported Sites tools were used only for database overview and bounded row reads.

| Data source | Coverage | Finding |
| --- | --- | --- |
| Owner-private integration preview | One progress row, revision 73; full document readable; no additional rows | No multi-answer conflicts in the six clear single-answer fields. Step 38 currently has one answer. The saved Step 36 multiple selection is legitimate. |
| Original version 4 | One progress row, revision 281; no additional rows, but the tool truncates the large document cell, leaving incomplete JSON | **A complete conflict scan is unavailable through this read. The absence of conflicts cannot be asserted.** |

No saved value was normalized, removed or rewritten. A complete read-only check of the original workbook would require its existing **Export my answers** JSON backup. That export can be inspected without restoring it or changing the workbook. Do not substitute the old local test snapshot for the latest saved document.

## G. Proposed safe correction, after approval

1. Add explicit single-selection metadata for the six fields in section A. Preserve their IDs and array-shaped saved values; do not simply change them to the existing scalar `single` type.
2. Render an accessible radio group or equivalent exclusive choice. On a deliberate customer choice, replace the field value with a one-element array immediately. Keep clearing/unanswered and partial-completion behaviour available.
3. When a historical value contains more than one answer, preserve the entire original array and show the recorded options for review. Do not pick the first, last or “most likely” answer. Require a deliberate customer selection to resolve that field.
4. Validate new edits against the approved cardinality and reject duplicate options in new submitted selections. Distinguish new-write validation from historical reading, backup restoration and local recovery, so older arrays remain recoverable. An unrelated save must not invalidate or modify unresolved historical fields.
5. Leave the 25 legitimate multi-selects, the six pending-review groups, matrices, axes, scoring, confirmation and final inheritance rules unchanged unless a separate interpretation is approved. Any import/content-build overlay must reproduce the metadata so a future content import cannot reintroduce this bug.
6. Test immediate replacement, saved/reopened values, contextual updates, synthesis/Blueprint consistency, confirmed wording, overrides, partial completion, both PDFs, recovery, backup import and concurrent sessions using synthetic records. Preserve unresolved historical values through those operations until the customer resolves them.

Changing `checks` straight to scalar `single`, or tightening the shared validator alone, is unsafe: backup import validates all answers, and encrypted local-recovery hydration currently rejects its pending patch on a validation failure. The correction must cover those compatibility paths together. No destructive data migration is proposed.

Relevant implementation: [checkbox importer](../scripts/import_content.py#L13), [rendering and change handling](../client/app.mjs#L58), [answer validation](../server/model.mjs#L101), [local recovery](../client/store.mjs#L17), [contextual references](../client/discoveries.mjs#L8), and [literal synthesis candidates](../server/synthesis.mjs#L4).

## H. Verification record

| Check | Result |
| --- | --- |
| All-68 inventory integrity | Every page and control placement matched the current source, including exact option arrays and manuscript/workbook SHA-256 fingerprints. |
| Existing regression suite | `npm test`: **115 passed, 0 failed, 0 skipped**. These existing tests do not establish correct exclusivity for the six affected questions. |
| Dedicated actual-client / local Worker reproduction | **6 of 6 single-answer defects reproduced.** For each field, selecting A then B kept both checked, saved both in isolated D1 and reopened with both. These are failures of the requested behaviour, not six successful corrections. |
| Contextual references | The local tests also displayed both contradictory answers in the next applicable reference panel for five affected fields. Step 45 has no such direct contextual reference. |
| Legitimate multi-select contrast | Step 36 retained both Home and Errands after saving/reopening, as intended. |
| Existing exclusive-control contrasts | A matrix row retained only the second answer; a preference axis retained only the second position. Both saved and reopened correctly. |
| Compass contrast limitation | The saved API value and emitted selected-option markup both retained the second decision. Happy DOM nevertheless reported the first option; the same mismatch reproduced in a static isolated select with no application code. This is a test-harness limitation, not a confirmed application defect. Native Chromium verification could not be completed in this runtime. Real-browser Compass decision save/reopen remains a manual acceptance check. |
| Hosted boundaries | Original site remains version 4; integration preview remains version 1. Both access-policy revisions remain 1, with one allowed account and zero external visitors. Policies were unchanged from the initial read. No hosted writes or deployment occurred. |

The [synthetic probe results](SELECTION-CONTROL-PROBES.json) contain observations from the real client bundled in memory and the actual Worker against isolated, temporary D1/R2. No hosted customer identity or customer data was used in these reproductions. There is no claim that the six bugs have been fixed, or that the truncated version 4 record has been fully audited.

Approval is requested for the six corrections and the preservation approach in sections A and G. The six overlapping cases in section B require an explicit keep-multiple versus single-overall-answer decision; until then, preserve their current behaviour.
