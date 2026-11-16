# In Her Fashion — Personal Style Blueprint

A private, interactive personal style workbook, not a PDF landing page. All 68 approved Draft 3 manuscript pages are mapped to a guided web journey. Customer answers drive their own editable reference; there is no AI, inferred aesthetic, body diagnosis, or prescribed wardrobe.

## Product and content

- [Implementation plan](docs/IMPLEMENTATION_PLAN.md): methodology, architecture and decisions.
- [68-page source map](docs/SOURCE_MAP.md): traceable screen inventory.
- `sources/`: untouched supplied DOCX files and their exact approved-page extraction.
- `content/workbook.json`: customer guidance and structured controls, separate from components.
- `npm run content:import`: reproducible approved R1–R10 adaptation from the approved extraction. Requires Python `python-docx` only when re-extracting a future DOCX; the web build uses the committed JSON.

Every screen includes the original guidance. Longer reading remains available through “Read the original guidance”; response components adapt print blanks into appropriate controls. The manuscript governs discrepancies with the PDF specification. No production notes or appendix appear in the customer experience.

## Stack and setup

Node 22+; ESM frontend components bundled with esbuild; Cloudflare Worker API; D1 structured records; R2 private images. No separate auth/session service: Sites supplies secure ChatGPT sign-in. Fonts are bundled with open licences.

```sh
npm ci --cache .npm-cache
npm run db:generate
npm run build
npm test
```

`npm run dev` starts an optional loopback Worker with durable local test storage. It does not simulate hosted authentication. Integration tests supply explicit fixture identity headers to the isolated test Worker. Never expose this test runner as production authentication.

## Persistence and privacy

The platform authenticates visitors and injects a stable, Site-specific `oai-authenticated-user-id`. All API operations require it; the application never accepts an owner ID from a form or URL. Production must run behind Sites' identity gateway, which owns and authenticates these headers. Do not expose the Worker directly on an alternate unauthenticated origin.

- Every D1 and R2 operation checks the authenticated owner server-side.
- No publicly addressable object bucket, guessed image links, shared answer pages or browser-only saved progress.
- Same-origin mutations, bounded request bodies, allowlisted structured responses, MIME/signature/size checks, output escaping and restrictive security headers.
- Revision-based updates prevent silent overwrites from another tab/device. Customers choose whether to reload the saved version or keep their latest local entries.
- A failed save retains edits and an AES-GCM encrypted browser recovery copy scoped to the authenticated account. After sign-in, same-revision pending edits recover; stale edits require an explicit conflict choice. Browser storage must be available. Offline edits are never reported as saved.
- Images are limited to JPG/PNG/WebP, 8 MB each and 40 evidence items per customer. Links and written references are supported without remote fetching.
- No customer answers, uploads, tokens or runtime database contents are committed to Git.

## Carry-forward and exports

Canonical fields (six-colour formula, core qualities, signatures and outfit directions) are reused. Profile summaries and style-language cells can read earlier user-authored responses with explicit source links. A local override remains the customer's choice and does not silently overwrite upstream observations.

The final reference includes identity/statement, personal definitions, language/translation, six colour roles, signatures, three outfit directions, rules, lifestyle priorities, Compass, master dossier and one-glance reference. Export the one-glance view as PNG, download a directly generated, authenticated PDF for the full dossier or one-page summary, or download/restore a versioned JSON answer backup. PNG output uses text authored by the customer, not an invented summary. Uploaded images remain in the private evidence library and are not embedded in the answer backup.

## Hosting and migrations

`.openai/hosting.json` records the Site identity, logical `DB` and `BUCKET` bindings. `dist/server/index.js` is the deployable Worker; static UI assets are embedded so the archive is self-contained. The immutable migrations in `drizzle/` are schema-only. Apply new schema changes through new migrations; do not alter applied migrations or run runtime DDL. Tests apply migrations only to their own isolated local databases.

The first deployment is owner-private. Customer release requires the owner to choose the Site audience. Identity and purchase access are separate. The `entitlements` table and `REQUIRE_ENTITLEMENT=true` boundary can later enforce verified access. No live payment integration, purchase webhook or automatic entitlement grant is implemented. Keep this flag unset until an approved provisioning flow exists.

## Verification scope

`npm test` checks all 68 source pages and original guidance, all component schemas, the complete save/reopen/edit journey, earlier-answer transfers, cross-account isolation, optimistic concurrency, 100-point validation, all Compass bands, image privacy/upload/sort/delete and the entire client route sequence using a DOM integration harness. Restart tests verify durable state. Export tests inspect real PDF bytes and the final dossier. See the updated test report for recovery, confirmation and independent Compass coverage. Browser/mobile visual testing and real hosted sign-in require the managed browser tools, which were not exposed during this build; DOM tests are not represented as full browser QA.

No customer access audience, payment integration or custom domain is changed by this build.

## Approved v1.1 changes

[Approval and implementation record](docs/v1-review/APPROVED_IMPLEMENTATION.md) describes the approved R1–R10 resolutions. `scripts/approved-v1.mjs` keeps optional v1 additions separate from Draft 3 source copy. Suggested patterns require acceptance and a separate copy action; assembled Style Brief wording stays pending until confirmed. No style is inferred or generated by AI. The 25-point Compass remains independently reusable.
