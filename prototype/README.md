# In Her Fashion — editorial product UX proposal

This feature branch is a reviewable design proposal, not a release. The owner-private version 4 application, its 68-step manuscript, authentication, storage, uploaded evidence, payment boundary and hosting configuration are unchanged.

## Try the three working screens

Download `design-preview/Personal_Style_Blueprint_Design_Preview.zip`, extract it and open `index.html` in a current browser. The HTML contains its own scripts, fonts and three sample photos; no server, Cloudflare setup or account is needed. Alternatively run `npm ci --cache .npm-cache` then `npm run design:build` and open `design-preview/index.html`.

The top ribbon identifies this as an example session. It uses only synthetic responses and licensed sample photographs, never the customer's saved workbook. The example's completion counts are computed from its saved record; they are not production progress.

1. **The journey:** a compact resume feature, five expandable chapters and preparation. All 68 original titles remain visible on expansion. Step 12 opens the represented discovery exercise. Other steps open their approved original guidance for context; they have not been redesigned.
2. **Silhouette Comparison:** the original step-12 questions are grouped into LOOK / CHOOSE / REFLECT / RECORD views. Every phase is directly available; there is no forced quiz sequence. Earlier silhouette selections are visible beside relevant outfit references. Choosing/reflecting/recording saves local responses. The original guidance remains available in full.
3. **My Blueprint:** a personalised identity, photograph and colour formula lead into One-Glance or Master mode. Customer words, original labels, missing-information guidance, source provenance and override semantics use version 4's existing model. Inputs appear only after choosing Edit. Master sections expand on demand rather than presenting a long wall of fields.

The other existing v4 screens and production UI remain unchanged. This proposal does not implement the redesign across all 68 pages.

## Product UX direction

A calm fashion publication organised around a personal discovery process. Reduce oversized headings and empty space that add scrolling; retain generous separation between ideas. Make current context, saved observations and the next action easy to find. Let customer photographs provide visual interest rather than decorative graphics or prescribed aesthetics.

The exercise separates observation, comparison and writing without replacing the approved methodology. Evidence is available at the moment of reflection. The final reference emphasises readable answers; source links, guidance and editing remain accessible on demand. No additional style diagnosis, inference, score or wardrobe audit is introduced.

## Responsive layout and design system

| Pattern | Desktop | Mobile |
|---|---|---|
| Chapter overview | 210px chapter rail; 1220px overall canvas; editorial resume feature and chapter rows | Single column, collapsed chapter lists, compact three-view bottom navigation |
| Exercise | Compact process rail, 560–650px reading area, 210–246px outfit/source rail | Direct phase tabs, 20px side margins, stacked questions, two-column photo collection |
| Final reference | Saved identity and portrait, two-column reference composition; expandable Master sections | Compact cover and portrait, readable stacked result sections; full-height editor drawer |
| Galleries | Consistent portrait containers with `object-fit: contain`; captions and observation drawer | Tap to inspect; multiple-file selector; touch alternatives to reordering |
| Source answers | Relevant saved choices inline; more detail expanded when needed | Compact context panel before the question |
| Editing | Explicit Edit action opens a focused drawer | Same interaction, with focus containment and Escape/Close support |

Type: existing Cormorant Garamond for editorial headings, DM Sans for reading and controls. Main headings 40–48px desktop and 34px mobile; body 16px; labels 14px; secondary metadata 12px. Use a 4px spacing unit: 8/12 for related items, 16/24 for components, 32/48 for sections. Use thin warm rules, restrained ink/ivory/oat surfaces and minimal borders rather than dashboard cards.

Colours: paper `#fffdf9`, canvas `#f4f0e9`, ink `#3f342d`, muted text `#75695e`, rule `#d8d0c6`, restrained accent `#866a52`. The customer's own six-colour formula is data, not part of the application's imposed aesthetic.

Breakpoints: compact desktop/tablet treatment below 1100px; stacked layout below 760px. Controls and response inputs remain readable without browser zoom. Reduced-motion preferences and visible keyboard focus are respected.

## Working interactions and boundaries

- Navigation, original guidance, phase switching, selections, reflections, source review, live answer inheritance on returning to the reference, deliberate overrides and completion counts.
- Browser-local save/resume in a separate preview namespace. Reset clears only that isolated example. Storage failures are shown honestly, with a close warning for unsaved changes.
- Local sample-photo collection: batch selection for Recent Outfits/Inspiration, previews, individual errors/retry, annotation, replacement, move earlier/later and deletion. Successful photo storage uses a separate IndexedDB database; if storage is unavailable, the upload remains failed and existing images are retained.
- Confirmed concise wording remains separate from pending drafts; source changes do not silently rewrite confirmed text.
- One-Glance/full PDF generation uses the existing v4 PDF implementation and embedded licensed fonts. Exported PDFs contain the example customer's answers, not sample photographs or display-only missing guidance.

This is not a customer authentication or server-storage test. The prototype never calls the production APIs, and its Content Security Policy blocks network connections. Production Sites sign-in, D1/R2, encrypted recovery, server PDF endpoint and batch-upload implementation remain intact. Local preview storage does not replace those services. OS file pickers, IndexedDB permissions under `file://`, physical mobile layouts and download handoff still require browser review; no browser-control tool was exposed during implementation.

Three stock images are explicitly samples, not customer evidence or wardrobe recommendations. Source URLs, checksums and licence references are in `prototype/assets/PHOTO_SOURCES.json` and the download's `LICENSES.txt`. The photos demonstrate outfit shape; they are not a complete representation of customer bodies or style preferences.

## Review tasks

- Open chapters and compare the reading density with version 4.
- In Discover, change a selection; use RECORD to edit the silhouette direction; view its result in My Blueprint.
- Edit a final field deliberately, then revise a source. Confirm the override remains intentional.
- Add sample photos, annotate one and reopen the file to check local resume.
- Switch One-Glance/Master and export both PDFs.
- Review desktop and phone widths, navigation, photo sizing, source panels, editing and keyboard behaviour.

Approval should settle the composition and interaction patterns before integrating this design with authenticated customer data or extending it to further exercises. No deployment or access change has been made.

## Verification

`npm run build` passes. All 94 automated tests pass: the existing 84 regression tests and 10 isolated-prototype tests. The prototype tests were rerun after the final source-panel return fix. Coverage includes the approved control options, all five chapter counts, navigation, local save/resume, source-derived answers, preservation of deliberate final edits, real PDF bytes (including the one-page One-Glance export), and 12-image batches for both evidence sets. Both successful local photo recovery and unavailable-storage errors are exercised, including failures to save photo metadata or annotations. Written references remain text rather than broken images.

The interaction tests use Happy DOM and a controlled photo-storage adapter. They do not verify browser geometry, native file pickers, physical touch behaviour or actual browser IndexedDB permissions. Desktop/mobile visual inspection, keyboard review and native download handoff remain review tasks. No real-browser pass is claimed.

The standalone build checks that protected production files remain byte-for-byte unchanged. The downloadable ZIP contains the standalone HTML, opening instructions and asset licences; it requires no network resources. Reproduce the prototype checks with `npm run design:test`.
