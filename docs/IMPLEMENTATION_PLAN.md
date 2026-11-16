# Implementation plan — Personal Style Blueprint web product

## Methodology and non-negotiables
Body + Personality + Lifestyle. Observe → Choose → Interpret → Record → Synthesize → Build. LOOK → CHOOSE → REFLECT → RECORD within exercises. The customer interprets their own real evidence: 8–12 recent outfits, 10–15 inspiration images, actual life. No body classification, automatic style diagnosis, prescribed aesthetic, AI identity, or generic generated advice. Preserve manuscript wording, exercise purpose, page sequence and locked examples. Exclude production notes/appendix. Keep all 68 source pages traceable.

## Repository inspection
The user-provided GitHub repository is empty. No framework, code, database, deployment identity or local instructions exist. Supplied DOCX manuscript matches the approved Draft 3 already reviewed. The supplied second DOCX is the PDF specification; its PDF-only layout constraints are adapted for responsive web use. No separate workbook-content document was supplied.

## Architecture and journey
A server-backed application using a Cloudflare Worker, D1 records, private R2 uploads and platform-owned secure ChatGPT identity. Semantic ESM client components and a versioned content catalog keep customer copy separate from application logic. A dependency-light Worker implementation is used because this environment does not have the Sites/Vinext starter scripts; the documented Worker deployment format is supported.

Start with a quiet editorial welcome, preparation and evidence library. Follow five parts in manuscript order. Each part has a contents view, page-based guided steps and a profile/synthesis checkpoint. Customers may revisit earlier pages freely. Completion is explicit, never inferred from random clicks. Later steps present earlier recorded answers with source links and explicit transfer controls. Final dossier has editable fields and a phone-friendly one-glance view, printable export, PNG export and JSON backup/import. No PDF sales landing page.

## Reusable interactions
Editorial passage; accessible checkbox choices; preference matrix; neutral labelled scales with an unanswered state; reflection response; structured table; pattern/evidence/meaning cards; six-colour role selector with names and swatches; repeated outfit directions; 100-point time map; reference/transfer panel; image upload/reference library; Compass score calculator with all approved bands; progress navigation; save/retry status; export sheet.

## Privacy, persistence and access
Use authenticated, Site-scoped stable user ID as the only ownership key. Every API operation authorizes server-side; callers cannot choose owner IDs. D1 stores per-user answers, completion and revision state; optimistic concurrency prevents silent cross-tab loss. R2 images have opaque IDs, ownership-checked retrieval and deletion, MIME/size checks, no public bucket routes. Mutations require same-origin requests. Responses and personal data are never cached publicly. Access-entitlement boundary can later enforce purchase verification, but no payment client or live payment endpoint will be implemented. Never accept mock identity in hosted code.

## Validation and delivery
1. Generate exact source catalog and a 68-row coverage map before app implementation.
2. Build guided frontend, response model, deterministic transfers and final reference/export.
3. Build protected persistence/upload API and bounded migrations.
4. Test all 68 screens, controls and coverage; saves/reloads/revisits; two-user isolation; concurrency; upload privacy; invalid data; transfer provenance; final exports. Run browser journey tests if supported browser infrastructure is available. Report any infrastructure verification gap explicitly.
5. Commit to a dedicated branch in product-sources; publish an owner-private working Site, verify deployed persistence where accessible, and supply URL/source/testing evidence.

## Decisions and approval boundary
Use supported ChatGPT sign-in and platform storage for the initial version. No missing decision blocks building a private working version. Before customer launch, the owner must select the customer access audience and purchase-verification provider; no public sharing, custom domain or payment integration is assumed. Email/password identity is not fabricated; a future external identity provider must be supported by hosting before adoption.

## Source conflicts resolved by precedence
Keep inspiration sorting on manuscript page 24 (spec mentions 23), actual page 14 option inventory, the long sentence frame on manuscript page 54, and page 61 guidance. Preserve all customer copy; layout adaptations may remove only placeholder underscores/dashes and repeated visual labels that do not add meaning, with source text retained for audit.
