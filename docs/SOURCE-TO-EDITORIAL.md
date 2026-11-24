# Source-to-editorial layout mapping

The editorial integration changes presentation only. The approved workbook, question/control IDs, choices, saved answers, confirmation rules, scoring and exports are not modified by this module.

## Runtime contract

- `pageLayout(page)` returns the source-specific sections for a manuscript page: `{id, title, headingLine, lines, controlIds}`. `lines` contains original `page.lines` indices, in order. Section titles are actual source text; empty title means an introductory reading block.
- `renderExerciseSections(page, {field, guidanceLine, jumps})` renders `.editorial-exercise`, sections with `data-layout-section` and `id="section-ID"`, and calls the existing `field(control)` once per approved page control. It interleaves original source guidance and fields at source anchors.
- Optional `guidanceLine(line, index, page)` returns trusted application HTML for that unchanged source line. The default formatter escapes text.
- Optional jumps are enabled only for question pages with two to six actual source headings. Buttons use `data-action="jump-exercise-section"` and `data-section="section-ID"` so the application can scroll/focus without changing its hash route. Set `jumps:false` where a surrounding component provides navigation.
- `layoutMetadata(pageNumber)` exposes the source ledger for validation and maintenance. An explicit guard rejects changed source length/title, missing controls or mismatched anchor cues instead of silently misplacing questions. Source hashes provide a full-copy QA check.

## Source fidelity and accounting

`content/editorial-layout.json` records 68 pages, 1,694 source lines and 372 page-local control anchors: 371 retained interactive placements and one retired legacy-preservation slot. A shared answer ID may appear on several manuscript pages; within each page it is rendered once. Every source line belongs to one section. The retired artifact is never shown as a new question; its schema, saved value and backup support remain unchanged.

Independent DOM/metadata verification passed:

| Check | Result |
|---|---:|
| Manuscript pages | 68 |
| Original source lines accounted for | 1,694 |
| Original lines displayed as reading or source headings | 931 |
| Source question/option/scaffold lines represented by unchanged controls | 726 |
| Decorative printed blanks/separators | 37 |
| Existing control anchors accounted for once per page | 372: 371 interactive + 1 retired legacy slot |
| Exact option/matrix-row representation proofs | 291 |
| Unmatched controls | 0 |
| Missing source lines | 0 |

Each represented line has a control ID, kind and reason. Question placement normalises curly/straight quotes, case and printed placeholder length for matching; it does not rewrite the source or the existing control labels. Inline option rows are omitted only when every source option is present in the unchanged control. Matrix-row proof uses the exact source quality names. Printed blank slots and structured paper scaffolds are explicitly linked to their existing interactive widgets. Explanations, interpretation caveats, examples, score anchors and non-prescriptive language remain inline.

Full original guidance remains available through the surrounding application. The module does not replace it, create a score, classify a customer, infer a style or generate any customer response. Part 5 may use the dedicated readable result components; its metadata remains fully mapped for source coverage.

## Variable source structure

No fixed LOOK/CHOOSE/REFLECT/RECORD schema is imposed. Page 4 teaches the general method; only exercise page 8 has all four standalone headings. Page 13 combines LOOK + CHOOSE, page 15 uses LOOK/SORT, page 25 uses PLACE YOURSELF, page 37 is a time-map tool, page 47 has three pattern records, and page 63 has three outfit directions. The layout uses those source structures, not fabricated stages.

### Step 12 source order

1. “What Keeps Showing Up?” / YES descriptions: `p12.choices1`.
2. “Now look at your MAYBES.” / NOs: `silhouette.notes.1`, `silhouette.notes.2`.
3. “LOOK FOR”: `p12.choices2`.
4. “RECORD”: `silhouette.notes.3`, `silhouette.notes.4`, `silhouette.notes.5`.

The existing “What do your NOs have in common?” control clarifies a pronoun in the source; its original “And your NOs.” / “What do they have in common?” cues remain inline. Questions are neither reassigned to a compulsory reflection stage nor omitted.

## Explicit source-anchor exceptions

| Case | Treatment |
|---|---|
| Evidence preparation pages 5/22 | Existing evidence control follows the collection instructions. |
| Approved v1 additions | R1 baseline, R4 prompts, R6 candidates/assembly, R9 summaries and R10 closing aids retain their existing controls and optional flags. They have explicit locations rather than fabricated source headings. |
| Page 24 | Sorting interface follows the four original inspiration-group definitions; the compiled group-specific reflection is anchored to its original question. |
| Pages 25/27 | Original placement questions and scale-anchor wording precede interactive scales. |
| Pages 29/30/61 | A single canonical six-role colour control is placed once. Role explanations remain visible; source order for new colour then three owned items is preserved. |
| Pages 34/42/47/50/60/63 | Existing composite tables/records replace their explicitly recorded paper scaffolds, while examples and explanatory prose remain. |
| Pages 36/39/41/66 | Frequency, needs, practicality and Compass scoring definitions appear before their respective matrices/scoring controls. |
| Page 37 | Existing labelled time-map inputs represent the matching printed activity blanks; original 100-point instructions remain visible. |
| Page 51 | The chosen-quality dictionary is primary under R5. The generic Add Your Own prompt anchors to its actual sentence, not the similar page subtitle; named prompts remain optional. |
| Page 56 | The repeated Core blank reuses one canonical qualities control; Supporting and Accent anchor to their original blanks. |
| Pages 67/68 | Existing shared final-reference controls and approved summary additions are mapped without changing their bindings. Dedicated final-result presentation can supersede form rendering. |

## Existing compiled-schema ambiguities retained

These predate the editorial integration; their final presentation treatment is explicit:

- Page 23 contains the proper `inspiration.want` matrix and the parser artifact `p23.choices6` whose options were `"|", "|", ""`. Root applied a presentation-only retirement: its empty anchor is hidden, and an existing saved value appears only in optional read-only “Earlier saved response” review. The schema, model, answer key, stored value and backups are unchanged. The source table header and row are credited to `inspiration.want`, which contains all three meaningful preference choices; no source line is credited to pipe-valued answers.
- Page 52 contains `p52.choices2` checkboxes and `like.me.3` text with the same lifestyle question. Both existing controls are retained as checkbox selection plus written reflection; no stored value or question was removed.
- Some controls aggregate multiple paper blanks, particularly six colour roles, the three pattern records and three outfit directions. The ledger states those exceptions rather than pretending that each aggregate has a one-to-one literal question anchor.

## Per-page ledger

| Page | Original title | Source lines | Existing controls | Source-specific sections | Source SHA-256 prefix |
|---|---|---:|---:|---:|---|
| 1 | Cover | 3 | 0 | 1 | `0eaeaf577284` |
| 2 | Opening Note | 13 | 0 | 1 | `e531a9df2385` |
| 3 | What This Blueprint Is | 9 | 0 | 1 | `767643fa24d4` |
| 4 | How to Use It | 16 | 0 | 4 | `087af202033e` |
| 5 | Your Evidence Sets | 14 | 1 | 1 | `e39fdceb9844` |
| 6 | Before You Begin | 12 | 5 | 1 | `f0fc7a412702` |
| 7 | Your Body | 9 | 0 | 1 | `24ecf1363071` |
| 8 | Fit | 36 | 4 | 5 | `28fda4be8fb8` |
| 9 | Fit Observation | 26 | 4 | 1 | `80585c1ddc4b` |
| 10 | Fit Interpretation | 8 | 1 | 1 | `11f4b160ea0b` |
| 11 | Silhouette | 34 | 1 | 3 | `b737b1f82fa3` |
| 12 | Silhouette Comparison | 29 | 7 | 4 | `1f2c13c5bd91` |
| 13 | Lengths and Proportions | 22 | 3 | 3 | `08116c85f1a0` |
| 14 | Lengths and Proportions: Choose | 34 | 7 | 3 | `f4b3f98b5e9f` |
| 15 | Necklines and Openings | 24 | 1 | 3 | `bfa2d1f2e6be` |
| 16 | Neckline Preferences | 16 | 4 | 2 | `636cb9c59314` |
| 17 | Skin Exposure | 16 | 1 | 1 | `03e2c79ecf04` |
| 18 | Skin Exposure: Choose | 12 | 2 | 3 | `895ad41f3a29` |
| 19 | Comfort and Movement | 36 | 4 | 4 | `2b94abd55c1e` |
| 20 | Body Style Profile | 19 | 11 | 1 | `284a14457878` |
| 21 | Your Personality | 27 | 0 | 1 | `40257830d7c2` |
| 22 | Inspiration Set | 8 | 1 | 1 | `7ff6af524ae9` |
| 23 | What Caught Your Eye? | 76 | 13 | 5 | `2e6db3ede27c` |
| 24 | Admiration Is Not Personal Style | 30 | 6 | 4 | `496197459489` |
| 25 | Visual Dials | 25 | 10 | 2 | `c621675f363a` |
| 26 | Visual Intensity | 37 | 6 | 3 | `88ae73c097f8` |
| 27 | Femininity, Polish, and Edge | 23 | 7 | 3 | `6ab77aef3ac9` |
| 28 | Colour: Natural Direction | 19 | 9 | 3 | `dcfe082be295` |
| 29 | Six-Colour Formula | 23 | 2 | 1 | `eab33b16f9e7` |
| 30 | Build Your Six-Colour Formula | 26 | 8 | 3 | `a3bff8b10884` |
| 31 | Style Signatures | 44 | 8 | 3 | `048b591d93a1` |
| 32 | Automatic and Deliberate Signatures | 19 | 5 | 2 | `bdc7a2e1054d` |
| 33 | Personality Style Profile | 14 | 8 | 1 | `4ab265343bed` |
| 34 | What Keeps Showing Up? | 21 | 10 | 2 | `1a8bd170a08e` |
| 35 | Your Lifestyle | 18 | 0 | 1 | `aa0a48c8d45b` |
| 36 | Where Do You Actually Go? | 38 | 5 | 3 | `3ebf53e09e00` |
| 37 | Real-Life Time Map | 20 | 1 | 1 | `1da067f119ab` |
| 38 | Read Your Time Map | 19 | 6 | 4 | `aa455f563360` |
| 39 | What Do You Actually Need to Get Dressed For? | 39 | 3 | 2 | `9add8f98a999` |
| 40 | Environment | 42 | 7 | 2 | `ec0a9730f330` |
| 41 | What Does Practical Mean to You? | 25 | 7 | 4 | `df019f558eaa` |
| 42 | Fantasy Life vs Real Life | 54 | 8 | 3 | `c2eb8ad88f74` |
| 43 | Lifestyle Wardrobe Profile | 6 | 6 | 1 | `dd159c9228ca` |
| 44 | What Does My Life Actually Ask of My Style? | 12 | 7 | 1 | `e4fc08d39136` |
| 45 | Connect the Dots | 34 | 4 | 2 | `f6a8163a9bb6` |
| 46 | Repeated Yeses | 58 | 3 | 4 | `e0c1f90cc2ab` |
| 47 | Strongest Patterns | 23 | 2 | 2 | `cff35f3cec3c` |
| 48 | Style Tensions | 25 | 9 | 3 | `ebe80cb0a8fa` |
| 49 | Style Balance | 47 | 5 | 3 | `2ccb90004276` |
| 50 | Translate Style Into Clothing | 17 | 1 | 2 | `930fc18fb702` |
| 51 | Style Language Dictionary | 15 | 8 | 2 | `bd57cf436874` |
| 52 | Looking Like Me | 29 | 8 | 6 | `e7f0b40faab4` |
| 53 | Good on Me Is Not the Same as My Style | 14 | 6 | 2 | `b993a6f6ce55` |
| 54 | My Style Direction | 17 | 8 | 3 | `9b0536307844` |
| 55 | Make It More Specific | 15 | 8 | 3 | `459560ce2c48` |
| 56 | Style Synthesis | 26 | 13 | 7 | `b308dd189dbb` |
| 57 | My Style Brief | 47 | 13 | 4 | `55fdb9c378c5` |
| 58 | Your Personal Style Blueprint | 5 | 0 | 1 | `019697eed0a1` |
| 59 | My Style Identity | 20 | 7 | 1 | `eddaa87a460d` |
| 60 | My Style Language and Style Translation | 19 | 4 | 1 | `8349fdc031db` |
| 61 | My Six-Colour Formula | 49 | 8 | 2 | `1906a458f75d` |
| 62 | My Style Signatures | 27 | 10 | 4 | `39c3dbcdc594` |
| 63 | My Personal Outfit Directions | 31 | 1 | 1 | `1d7a4e0fc7cc` |
| 64 | My Personal Style Rules | 21 | 9 | 3 | `d9bff03ccf14` |
| 65 | What I Don't Need to Become | 17 | 6 | 3 | `9b1c2807e047` |
| 66 | Personal Style Compass | 27 | 4 | 2 | `29d8ffa1ca91` |
| 67 | Final Style Statement and Master Blueprint | 36 | 26 | 1 | `335e6e953a3c` |
| 68 | One-Glance Blueprint and How to Use Your Blueprint | 22 | 10 | 3 | `31ddb11ec545` |

## Maintaining copy or controls

After an approved source/control change, review affected line anchors, section boundaries and represented-line proofs, then regenerate the hashes and rerun source/DOM coverage. Do not append unmatched controls to the end silently, remove explanatory copy to make coverage pass, or treat a label-normalisation match as permission to alter approved wording. No server/browser, deployment, data-reset or schema action is part of this module.


## Final source review note

The p23 table artifact is retired only in presentation. `p23.choices6` remains in the 372-anchor inventory for existing-response preservation, while `inspiration.want` alone represents the original semantic table. Root renders 371 active interactive placements plus one empty-hidden or optional read-only legacy slot. The source p52 checkbox and text response remain unchanged. This treatment removes no approved exercise, option meaning, stored response or backup field and adds no interpretation.
