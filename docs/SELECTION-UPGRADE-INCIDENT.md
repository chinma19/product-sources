# Selection upgrade and save compatibility

Investigated 25 November 2026; publication verification continued 26 November 2026 · `codex/editorial-integration`

## Verified cause

The published integration version 2 contained the corrected exclusive controls. Authorized, read-only HTTP requests to the actual private Site returned JavaScript with SHA-256 `d48b61700b83207e48f1d1cae535e3d5bf72ab3fa6fc22c76648ac0ba166f6b0`, byte-identical to the published artifact and containing the radio implementation. This rules out a missing client fix in the uploaded version 2 artifact.

However, the HTML continued requesting the fixed URLs `/assets/app.js` and `/assets/app.css`. Both actual hosted responses advertised `Cache-Control: public, max-age=86400`, while the HTML was `private, no-store`. A new HTML response could therefore use an older cached client. An already-open page also keeps its loaded JavaScript independently of HTTP caching. This is the upgrade path the previous same-version checks missed.

The earlier client accumulates Yes and Mostly into the same Step 38 array and submits an unversioned request. The version 2 server rejected that entire atomic patch. The failed patch returned to the pending queue, so later Compass entries were merged with the same rejected Step 38 response and failed again. Recovery compatibility in the new client could help only after that new client actually loaded.

This exact failure was reproduced using the pre-fix application client and the actual version 2 Worker bundle, with synthetic data: the Step 38 save returned `Invalid response for p38.choices1`; subsequent Compass item, scores and notes were rejected in the same patch. No customer record was changed to reproduce it. The customer's browser cache itself is not accessible in this chat; the old-client/new-server mechanism, hosted cache policy and reported behaviour agree.

## Correction

- Builds now emit content-hashed JavaScript/CSS URLs and one reproducible release identity shared by the client and Worker. Built HTML references those exact assets. `/api/version` exposes only release ID, protocol and asset checksums; customer-record endpoints retain their existing authorization.
- Current hashed assets are privately cacheable and immutable. Fixed legacy app URLs return the current bytes with `no-store`. Requests for a previous hash redirect without caching to the current asset, covering HTML fetched immediately before publication. New bytes are never served as immutable under an old hash.
- Modern clients identify selection protocol 2 and retain strict exclusive-choice validation. Unversioned older clients receive a compatibility save that preserves every structurally valid historical selection array and the complete atomic patch, including unrelated Compass entries. Unknown options, malformed restoration markers and unsupported declared protocols remain rejected.
- The updated exercise displays preserved conflicting selections for deliberate customer review; it never chooses one automatically. All six corrected controls remain exclusive for new choices, and the 31 approved multiple-select groups remain multiple.
- Unreadable or invalid encrypted recovery data is preserved and protected from replacement. A visible warning replaces the previous automatic deletion behaviour. Recovery failures also preserve entries already pending in memory.
- Newly loaded clients check for updates without forcing a reload. The explicit update action saves progress first and keeps the workbook open if saving fails or photo uploads, annotations or evidence references remain unsaved. Existing before-unload protection remains.

No manuscript copy, questions, options, scoring, synthesis, confirmation rules, deliberate overrides, account access, payments, database schema or migrations were changed.

## Verification

- Reproduced the original old-client/new-server failure before correcting it.
- Upgrade-specific suite: 7 passed, including the actual previously hosted version 2 client and the actual current built Worker/client.
- Targeted selection and recovery suites: 20 additional checks passed (15 selection, 5 recovery).
- Verified identical repeated builds of release metadata, built HTML, JavaScript, CSS and Worker.
- Full regression suite: **137 passed, zero failed or skipped**, including the complete 68-step journey, partial completion, confirmation/overrides, photo features, account isolation and both PDF exports.

Upgrade coverage includes an already-open pre-fix client saving the entire Step 38/Compass patch; offline recovery across the earlier client, actual cached version 2 client and the new client; all six current artifact controls through save/reopen; strict modern validation; retained historical arrays; protected recovery; unsupported-protocol pending preservation; version/asset checksum agreement; previous-hash redirects; and guarded updates without automatic reload.

## Hosted verification and data boundary

Target: https://inherfashion-integration-review.fabulousloon.chatgpt.site

The corrected **owner-private integration version 3** was published successfully on 26 November 2026. Post-publication HTTP inspection verified the actual HTML, `/api/version`, client-embedded release ID, hashed JavaScript/CSS, legacy aliases and previous-hash redirects. All identity, SHA-256 and cache-policy checks passed. The [sanitized hosted verification](SELECTION-UPGRADE-HOSTED-VERIFICATION.json) records the exact responses.

- Application source: `d355d67bf50e8c27e8182cb88d80c5c1ca847573`.
- Published source: `dd244e72e400d07a6b3b40d497318291cc1aea96`.
- Deployment: `appgdep_6b0883222150819186f6768de1fd8fdd`, `succeeded`.
- Release ID: `ad043d165225e6857f1d9698cd9fbc1135b83c41c7bcfb073f96a7561cc8cfb0`.
- Published client SHA-256: `1f4de14cd171657491bc25146187cd07b8decfb63215c68f36422352f1f6a393`.
- All seven upgrade scenarios passed again using both the actual previously hosted client and the actual newly published JavaScript. This includes all six controls through immediate replacement/save/reopen, mixed Step 38/Compass saves and recovery across three releases. Authenticated write tests remained in local isolated storage.
- Both sites retain access-policy revision 1, one allowed owner account and zero external visitors. The original Site remains version 4.
- Read-only pre/post-publication projections and record revisions were unchanged. The preview's large progress document was truncated by the database tool, so this is not a complete answer-by-answer comparison. There was no customer-record write, reset, restore or migration performed by this work, and no photograph operation.

The supported service credential is used only for read-only static/version requests to this Site. It does not provide a visitor identity; no identity header is fabricated to access or modify a customer's hosted workbook. Database checks use the supported read-only Sites tools. All write tests use temporary local D1/R2 and synthetic accounts.

## Acceptance boundaries

Native browser control is unavailable in this chat. Automated execution of the exact published JavaScript establishes the bundle behaviour, not the customer's phone cache, touch controls or OS download handling.

After the integration update, an already-open older tab can finish saving its complete pending workbook before a normal reload. Finish any photo upload or unsaved photo/reference annotation before leaving that tab. No browser-storage clearing, workbook reset or discarded recovery data is required. After reload, review any preserved conflicting Step 38 answer and deliberately choose one answer.

Manual acceptance should verify Yes → Mostly leaves only Mostly selected, saving/reopening all six controls, and saving the independent Compass and Step 66 after resolving Step 38. The original version 4 Site is outside this update. Future incompatible protocol changes must retain a compatibility save path for their supported previous clients before those clients are retired.
