# Approved R1–R10 validation

Date: 2026-11-16. Synthetic customer data in isolated Miniflare D1/R2; no production customer data used.

## Results

- Production Worker build passed. All 20 automated tests passed.
- All 68 manuscript routes render and complete; saves persist, survive Worker restart, reopen and remain editable.
- Full client journey checks rejecting/accepting patterns, separate copy confirmation, pending versus confirmed Style Brief, dictionary editing, earlier-response revision, dependent profile/translation updates, final generation, actual PDF download, return/resume and independent Compass reset without loss of completion.
- Recovery tests cover failed save, closing/reopening, retry, encrypted large drafts, tampering, account separation and explicit stale-draft conflict resolution.
- Server tests cover account isolation, unauthenticated denial, revision conflicts, entitlement boundary, evidence upload/annotation/sort/delete and owner-specific exports.
- Original Draft 3 wording (except explicitly approved length amendment), consolidated profiles, optional additions and Compass questions/bands/intentional exception checked.
- Full PDF, one-page PDF and UI-generated PDF rendered: five pages total visually reviewed after font fix. Automated checks verify complete heading glyphs, embedded fonts, one-page limit, nonempty pages and page bounds. `python scripts/check_pdf_exports.py` reproduces these checks (requires PyMuPDF).
- Overlong One-glance export returns actionable 422; empty reference returns 400; unauthenticated PDF returns 401. No silent truncation.

## Remaining verification limits

Managed browser controls were not available. DOM integration is not browser visual testing: real hosted sign-in, actual mobile viewport/keyboard/touch layouts, native download handoff, PNG canvas and physical-device accessibility still require manual review. Responsive CSS and semantic controls are implemented, but are not represented as visually tested. Owner-private hosting is retained; no public launch or payment integration is authorised or performed. Recovery requires available browser storage and authenticated access before decrypting pending edits.

## Automated run

```text
> in-her-fashion-blueprint@1.1.0 test
> node --test tests/*.test.mjs

✔ all 68 approved pages and source wording are accounted for (2217.239156ms)
✔ anonymous API requests are rejected; identity is never stored in browser data (40.457159ms)
✔ all 68 source steps complete, persist, reopen, and remain editable (899.39455ms)
✔ recorded answers carry forward without generated style claims; overrides stay deliberate (1.660222ms)
✔ private responses, exports, and optimistic concurrency isolate accounts (50.975868ms)
✔ time map totals and Compass bands follow the manuscript (14.528169ms)
✔ private evidence upload, image retrieval, sorting, deletion, and validation (153.973774ms)
✔ every client route renders, saves an entry, returns to it, and shows final transfers (3869.918975ms)
✔ durable progress survives a Worker restart and export stays complete (4212.805436ms)
✔ future purchase-verification boundary blocks accounts without explicit entitlement (4182.855615ms)
✔ approved amendments remain optional and preserve locked Compass content (1.500486ms)
✔ legacy answers survive migration and spectrum positions retain their meaning (78.625815ms)
✔ evidence annotations are editable, versioned, private and limited to approved observations (48.728523ms)
✔ the final Blueprint has an owner-specific direct PDF and no empty-field placeholders (1418.251565ms)
✔ customer completes the UI journey, confirms synthesis, returns later, exports PDF, and reuses Compass (2639.596481ms)
✔ only literal positive cross-part patterns become candidates; admiration alone is excluded (3.465904ms)
✔ assembled draft is deterministic, exposes missing slots, and never writes a final answer (1.121666ms)
✔ recovery ciphertext is account-isolated, tamper-resistant, and handles large drafts (79.541395ms)
✔ failed save survives closing/reopening the store and clears recovery after a successful retry (32.892857ms)
✔ stale recovery requires an explicit choice and preserves newer unrelated server answers (2.408539ms)
ℹ tests 20
ℹ suites 0
ℹ pass 20
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 50964.996464
```
