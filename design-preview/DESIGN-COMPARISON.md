# In Her Fashion — revised editorial UX prototype

This is an isolated design proposal on `codex/editorial-design-preview`, awaiting approval for integration. The owner-private version 4 application, Draft 3 wording, all 68 exercises, scoring, customer responses, customer evidence, access, payments and hosting configuration are unchanged. There is no customer-data migration or deployment to the version 4 Site. A separate owner-private static design preview is prepared for phone testing.

## Open the working comparison

Download `design-preview/Personal_Style_Blueprint_Design_Preview.zip`, extract it, then open **review.html** in a current browser. The review has a single live iframe with **360px, 390px, 430px, 768px tablet and 1280px desktop** width selectors. Changing width resizes the same session without scaling or resetting its responses. Screen selectors open the discovery exercise or Master / One-Glance presentation.

Open **index.html** directly for a full-window preview. The HTML embeds the scripts, fonts and three stock sample photos; no account, server or Cloudflare configuration is required. If a browser blocks local frames, use index.html. Some phone file viewers do not execute JavaScript in downloaded HTML; native phone opening, upload and download handoff remain manual checks. The phone-testing option is a separate owner-private static Site, with no connection to the live workbook. Its URL is supplied in the delivery message after publication succeeds.

The header and represented screens explicitly identify **sample customer answers**. The existing synthetic example session and anything added to it save only in the separate preview namespace `inherfashion.editorial-preview.v1`. Images use only the preview database `ihf-editorial-preview-photos`. Neither the live workbook nor its evidence is accessed. Unavailable browser storage is reported without claiming a successful save. Reset clears only the isolated example.

## Three representative screens

1. **The journey:** compact resume feature, expandable preparation and five chapters, computed completion counts and all 68 original step titles. Step 12 opens the working discovery exercise. Other original exercises are available as reference panels; only step 11's silhouette source ratings have a working earlier-answer editor here. This is not a redesign of all 68 screens.
2. **Silhouette Comparison:** the exact seven original controls, labels, options and full guidance, in continuous scroll by default with optional, source-specific section jumps. The approved order is YESes → MAYBES/NOs → LOOK FOR → RECORD, including all three RECORD responses. A switch retains the separate-stage alternative and the same answers. There are no required phase clicks or extra completion requirements.
3. **My Blueprint:** retained editorial Master / One-Glance presentation, inherited answers, deliberate edits, confirmed wording, source links, partial-completion guidance, optional focused editors and existing version 4 PDF exports.

## Evidence is central

The represented Silhouette Comparison uses the **Recent Outfits** collection explicitly. All relevant items appear in a prominent, collapsible gallery above the questions; none is removed by a three- or four-photo display cap. Inspiration images stay in their own collection and are not mixed into this exercise. The total existing library limit remains **40 items**. The drawer and library explicitly name **Recent Outfits** or **Inspiration Photos**. The photo manager shows one collection at a time; both remain accessible through labelled controls. Step 23 explicitly compares inspiration with actual clothes and demonstrates separate collection tabs in its reference panel. Other, unrepresented exercise editors are not redesigned.

The full collection uses compact portrait containers with `object-fit: contain`, captions and literal saved annotation excerpts. Opening a photo enlarges it, shows all saved annotations and offers the existing optional annotation editor. A full-size image link is also available. Written references have text cards rather than broken image placeholders. No photographs are interpreted automatically.

The sticky section navigator includes a **Recent Outfits** shortcut. It opens the same relevant collection while customers write longer reflections. Photo and source overlays preserve the question DOM, current typed value, selection and scroll position. Closing an overlay returns keyboard focus to its trigger; nested viewers return to their parent gallery. Galleries are not repeated under every question.

Batch selection, desktop drop support, previews, per-image progress/errors/retry, annotation, replacement, ordering and deletion remain available for both evidence sets. Photo bytes and lightweight metadata are saved separately; either failure is reported honestly.

## Continuous scroll versus separate stages

| Consideration | Continuous scroll | Separate stages |
|---|---|---|
| Reading comfort | Guidance and all questions remain in one document, separated by clear headings and warm rules. Longer page. | Fewer questions visible at once. Earlier questions need a stage change. |
| Navigation | Scroll naturally or use optional jumps. Zero section changes are required to reach all questions; jump labels follow each exercise’s actual source content. | Three stage changes are needed to see the other three stages from the starting view. Every stage remains directly accessible. |
| Visual evidence | Full relevant collection above questions plus a persistent shortcut. | The same relevant collection and shortcut remain available in every section. |
| Revising a response | Earlier inputs stay in place. No view switch required. | Change stage to review another group; saved values remain shared. |
| Accessibility | Native document order, headings, fieldsets and labelled inputs; a longer page to navigate. | Shorter document, with additional focus placement and current-stage feedback to understand. |
| Mobile | Single-column questions; expandable evidence prevents the photo collection dominating every revisit. | Same touch controls and photo availability, with more stage switches. |

**Preferred pattern:** use continuous scroll as the default for this evidence-based exercise, with compact jump navigation and an expandable full gallery. It keeps related observations available and removes unnecessary view changes. Retain the comparison option during design review. Do not force every exercise into four stages; only step 8 literally uses all four LOOK / CHOOSE / REFLECT / RECORD headings. Step 12 now follows its own approved question order, and unrepresented pages remain a single source-content block until individually designed; this is a design recommendation, not a measured user-study result. Confirm reading comfort on actual phones before approving a product-wide pattern.

## Desktop and mobile comparison

| Viewport | Exercise and photographs | Finished Blueprint and editing |
|---|---|---|
| 360px | Single-column writing; 16px response inputs; compact four-stage navigator; expandable two-column photo grid. | Stacked readable sections and colour roles; full-width PDF action and focused editor. |
| 390px | Same structure with more room for captions and comparisons. | Same single-column reference, wrapping long saved text and source links. |
| 430px | Same touch-first layout; no extra questions or desktop-only actions. | Same complete content, controls and PDF actions. |
| Tablet · 768px | Wider single reading column and three-column evidence grid. | Editorial cover; simplified reference grids, readable source panels and bounded editor. |
| Desktop · 1280px | Reading canvas up to 1040px, two-column choice cards, four-column evidence grid. | Editorial identity/photo cover, two-column reference composition and side editor. |

The comparison page changes the iframe's real CSS-pixel width; it does not shrink a desktop screenshot. It is a working responsive review tool, not physical-device verification.

Typography retains Cormorant Garamond headings and DM Sans controls/body. Body and inputs use 16px; primary labels and controls 14px; secondary metadata 12–13px. Editorial headings are approximately 34px mobile and 40–48px desktop. The mobile One-Glance style statement is now 21px with 1.45 line height and tighter spacing; Master Blueprint typography remains expressive and unchanged. Spacing follows the existing 4px unit, with 8/12/16/24/32/48px intervals. Warm ivory, oat, taupe, brown and charcoal remain restrained application colours; the customer's six-colour formula remains their own data.

Mobile controls have at least 44px targets; inputs stay 16px to avoid focus zoom. Editors have a bounded body scroller, persistent Close/Done actions, safe-area padding and dynamic viewport height support. Dialogs are labelled; background content is inert while a modal is active; keyboard focus is contained and returned. Reduced-motion preferences are respected.

## Answer provenance and wording

Presentation labels distinguish:

- **Customer-written reflection** and **Customer-selected options** for direct responses.
- **Inherited from earlier responses**, with source links, for connected final answers.
- **Deliberately edited** for an explicit final override.
- **Confirmed customer wording**, including a review notice if recorded sources change.
- **Optional draft · review required** for pending assembled wording.

These labels come from version 4's saved-response/binding metadata. They are UI guidance, never customer content or new workbook questions. Existing ambiguous values remain saved and available for review. Table-cell provenance remains separate where a customer edits only one cell.

Drafts are assembled only from recorded responses through the existing implementation. Nothing is generated from photographs, no aesthetic is assigned, and no draft enters a final answer without the customer's confirmation. Changing earlier responses does not silently rewrite confirmed wording or deliberate overrides. Provenance labels, sample disclosures and missing-information guidance are not added to the exported PDF as customer answers.


## Per-exercise evidence and section rules

`prototype/evidence-purpose.json` records eligible evidence collections for all 68 source pages, each with literal manuscript cues and a reason. `prototype/EVIDENCE-MAPPING.md` explains conditional uses. Eligibility does not automatically add a gallery: profiles, synthesis and final references primarily use saved responses. Page 52 asks for one outfit from either collection, not two full galleries. Only the represented step-12 editor and the step-23 read-only comparison panel use the new gallery components here.

`prototype/exercise-plan.mjs` holds source-specific section plans. Step 12's question order now matches the manuscript: YES choices, hesitation and NOs reflections, LOOK FOR preferences, then all three RECORD responses. Step 8 documents the genuine four-stage form; unrepresented pages keep one source-content block. The continuous-scroll preference does not add headings, answers or completion requirements to every exercise.

## Safe testing on your phone

A separate static Site can provide a normal HTTPS link behind the owner's ChatGPT sign-in. It contains only the built synthetic-data prototype, no D1/R2 bindings, no production credentials and no live workbook endpoint. Its different origin isolates browser progress from version 4. Its Content Security Policy blocks application network connections. Test-photo bytes and test responses remain in that browser; they are not sent to the workbook's storage.

1. Open the separate private review URL from the delivery message in Safari or Chrome on your phone, using the ChatGPT account that owns the Site.
2. Open Discover. Check the smaller One-Glance typography through My Blueprint, then return to the exercise.
3. In My photos, use disposable sample images to select 10–12 files for Recent Outfits and repeat for Inspiration Photos. Confirm the collection heading and saved annotations.
4. Use the Recent Outfits drawer while writing a reflection, close the image and check your text and place remain. In The journey, open What Caught Your Eye? (step 23) to compare the two collections separately; this panel remains reference-only.
5. Leave and reopen the private URL in the same browser to check local recovery. Export One-Glance and Master PDFs; if your phone opens a PDF viewer, use its Save/Share controls.

The private review Site is separate from version 4 and can be unpublished after review. It has no automatic expiry. It is not a customer-account or server-persistence test. The width selector remains available in review.html for comparison; real phone observations are still the acceptance check.

## Verification and limits

The production build and **all 104 automated tests pass**, with zero failures or skips: 84 existing regression tests and 20 isolated-prototype tests. New coverage includes the source-approved section/control order, separate collection access, collection-aware 12-photo batches/reload, and static phone packaging that rejects the original Site identity and has no database/storage bindings. The full 40-item gallery, existing annotations, question DOM/value/selection/scroll preservation, nested-dialog focus, provenance and confirmed wording, five-width review, save/resume, deliberate overrides, partial completion and real PDF-byte tests continue to pass. The One-Glance example export has one page.

The interaction suite uses Happy DOM and a controlled photo-storage adapter. It can establish saved-value behaviour, event handling, source propagation, PDF bytes and failure handling. It cannot establish native browser geometry, actual screen-reader output, touch behaviour, OS photo pickers, real IndexedDB permissions or phone download handoff.

The managed workspace reports a desktop capability but exposes no desktop JavaScript/browser-control tool in this session. The [Sites skill](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) says, “If `cua_repl.js` is unavailable, skip browser QA.” No browser server or substitute browser was started. Real-browser checks remain outstanding. Production sign-in, D1/R2 and the authenticated server PDF endpoint have not been retested by this offline prototype.

Build with `npm run design:build`, test the isolated preview with `npm run design:test`, and run the full regression suite with `npm test`. The build guards protected production-file hashes. The downloadable ZIP contains index.html, review.html, this comparison, instructions and licences. Photo source URLs, checksums and licence references are in `prototype/assets/PHOTO_SOURCES.json` and LICENSES.txt.

## Review checklist before integration

- Compare both exercise patterns at all five widths; read and revise every represented original question.
- Add 10–12 photos at once to each evidence set; inspect all relevant recent photos and the saved annotations.
- Collapse/reopen the gallery; use the shortcut from a long reflection; close a photo and confirm your place and text remain.
- Edit step 11, return to the question and verify the literal earlier selections update.
- Change a source, inspect inherited content and preserve a deliberate final edit and confirmed wording.
- Review partial completion, Master and One-Glance; download both PDFs.
- On actual mobile browsers, verify photo selection, keyboard navigation and editing, save/reopen and PDF handoff. An offline width frame does not replace these checks.

Approve the represented composition and interaction patterns before integrating them into authenticated customer flows or extending them to the other exercises. No deployment or access change is included.
