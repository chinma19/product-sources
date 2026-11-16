# Private preview and real-browser review

Recorded 2026-11-16. No access, payments or deployment changes are required for these checks. The existing hosted version is version 2, source commit 3cdc0f9282e8612ee82be5c876d7306749d14150.

## Open the real application

https://inherfashion-personal-style-blueprint.fabulousloon.chatgpt.site

Open this in a normal browser tab on your computer or phone. Use the ChatGPT account that owns this Site. If prompted, select Sign in with ChatGPT and complete the platform sign-in in the top-level tab. The Site is restricted to one owner, with no groups or external visitors. A different account should not gain entry. No customer invitation or public access has been enabled.

The owner confirmed “Workbook opens” during this review. This verifies access in that current session; it does not establish a fresh sign-in, successful writes or mobile compatibility. Browser/device were not yet supplied.

## Cloudflare and authentication

For the existing private Site, no personal Cloudflare account, Wrangler login, OAuth app, API key, DNS change or new deployment is needed. Sites provisions the Worker, D1 database and private R2 bucket. The tracked `.openai/hosting.json` identifies the existing project and declares `d1: "DB"` and `r2: "BUCKET"`. D1 holds progress/evidence metadata/entitlements; R2 holds private images. Schema migrations 0000 and 0001 are already in the deployed artifact and are applied by the hosting workflow.

Hosted authentication is ChatGPT sign-in managed by Sites. It is not a separate email/password or password-reset system. Sites handles `/signin-with-chatgpt`, `/signout-with-chatgpt` and `/callback`; do not implement or register duplicate callbacks. The gateway supplies authenticated identity headers; every application API checks the identity and ownership. A standalone public Worker that merely trusts user-supplied identity headers is not a supported secure replacement. Moving to a personally managed Cloudflare account would require a separately designed trusted authentication boundary, storage bindings and migrations; that transfer has not been implemented or authorised.

`REQUIRE_ENTITLEMENT` is intentionally not enabled for this private review. No payment provider or payment keys are needed. Do not enable it until an approved provisioning flow exists.

## Run the source locally for development

Use Node 22+ (the current workspace uses Node 24) and npm. To obtain the reviewed code on your computer:

```sh
git clone --branch codex/approved-v1-implementation https://github.com/chinma19/product-sources.git
cd product-sources
npm ci --cache .npm-cache
npm test
npm run dev
```

In the existing Codex workspace, use `cd /workspace/work/product-sources` instead of cloning. GitHub access is required if the repository is private.

The runner builds the Worker, creates local Miniflare D1/R2 bindings, applies migration-journal entries and listens at http://127.0.0.1:4173. Persistent local test storage is under `.wrangler/local/`, separate from hosted records. Stop with Ctrl+C; restarting preserves that local storage. No real Cloudflare credentials are used.

Important limitation: local Miniflare does not provide the Sites sign-in gateway. A normal local browser receives the application's sign-in screen; clicking its hosted sign-in route cannot provide functioning local authentication. Integration tests inject fixture identities only into their isolated local Worker. Do not treat that as real sign-in or add a production auth bypass. Use the existing owner-private HTTPS Site for the complete signed-in browser review. The current cloud session exposes no browser control/preview tool, so no local server was started during this review.

## Manual verification sequence

Use a clearly labelled test note or non-sensitive image and avoid overwriting work you want to keep. A hosted save changes your real owner workbook. Export an answer backup from My Blueprint before substantial edits; image bytes are not included in that backup. Review on a desktop browser and a physical phone; device emulation is a useful additional check.

1. **Save and resume:** enter a distinctive note in an unused field, click Save progress and wait for the saved status. Close and reopen the tab. Confirm the note and current step. Open the Site on a second device with the same owner account to verify server persistence rather than just same-browser recovery.
2. **Fresh authentication:** save all pending work, use Sign out, then sign in again as the owner. Confirm the existing workbook returns. In a private browser window, verify anonymous visitors cannot read answers. Do not change access to test another customer; owner-private hosting currently prevents a second customer account from entering. Cross-account separation has automated coverage, but real two-customer testing remains pending an expressly approved restricted invitation.
3. **Mobile:** test at approximately 360, 390 and 430 CSS pixels plus landscape; open Menu, move between sections, expand guidance, edit translations, use scales, select colours and open the onscreen keyboard. Check for horizontal overflow, obscured buttons, clipped text, focus visibility, readable labels and usable touch controls. Repeat key flows on mobile Safari or Chrome and record exact device/browser.
4. **Evidence:** under My evidence, upload a non-sensitive JPG/PNG/WebP under 8 MB. Give it a title, save annotations and reopen it after refresh. Add a written/link reference. Sort inspiration as Beautiful + Me and Beautiful + Not Me; confirm each selection persists. Remove a disposable image and verify it disappears. HEIC is not supported; export it to JPG first. Oversized/unsupported uploads should show an actionable error.
5. **Complete the five-part journey:** use Complete & continue, not just navigation. Include Preparation 1–5; Your Body 6–20; Your Personality 21–34; Your Lifestyle 35–44; Connect the Dots 45–57; Your Personal Style Blueprint 58–68. Check original guidance and consolidated profiles. Allocate the lifestyle time map to exactly 100. Optional v1 prompts may remain blank.
6. **Edits and dependent sections:** change a fit observation at step 10, save it and revisit profile 20 and Style Language 60. Unoverridden derived fields should reflect the edit. Deliberate downstream overrides should remain unchanged. Return to the original step and confirm its wording is preserved.
7. **Confirmation gates:** at 46, accept/reject available cross-part candidate patterns and confirm that nothing enters Repeated Yeses until the separate copy action. No candidates is a legitimate result when no literal positive terms recur across parts. At 54, request and edit a draft Style Brief; before confirmation it must stay out of final wording, including after refresh. Confirm only wording you want to keep, then inspect the Blueprint.
8. **Final outputs:** review the Master and One-glance Blueprint, including concise rules and shopping filter. Edit a summary, save and refresh. From My Blueprint choose Export my Blueprint PDF; at step 68 choose Export one-page PDF. Open both downloaded files in an actual PDF viewer. Check your latest words, colour swatches, page breaks, readable headings and no clipping. A too-long One-glance must request shorter summaries or offer the full paginated PDF, not silently cut content. Also test Save one-glance image and Export my answers. JSON exports contain responses and evidence references, not image bytes.
9. **Independent Compass:** open `/#/compass`, name an item and score the five exact questions 0–5. Test totals 25, 20, 16, 12 and 4 to cover the approved bands, and read the intentional colour exception. Save a decision and reopen it. Start a new item and confirm that only this evaluation resets; prior Blueprint and journey completion must remain.
10. **Recovery and conflicts (desktop, after backing up):** set DevTools Network to Offline, edit a disposable field and wait for a failed save. Close/reopen while online and signed in: pending edits should recover privately and require saving. For conflicts, open two tabs at the same revision, save one tab then change/save the other. Verify the explicit saved/local choice instead of silent overwriting. Browser storage must be available for local recovery. Turn network back online afterwards.

Record each result as PASS, FAIL or NOT TESTED, including route, device/browser, expected behaviour, actual behaviour and whether refresh changes it. Do not include private responses or images in shared reports.

## Verification ledger

| Area | Evidence | Current status |
|---|---|---|
| Build and full isolated journey | 20 automated Worker/DOM tests, including save/resume/edit/transfer/export/Compass | PASS (automated) |
| PDF rendering | Five fixture PDF pages rendered and visually inspected; fonts, text bounds and one-page limit checked | PASS (fixture output) |
| Current hosted owner access | Owner reports “Workbook opens” | PASS (current session) |
| Fresh hosted sign-in/sign-out | Needs real browser round trip | NOT TESTED |
| Hosted save/resume and second device | Owner prompted to verify | PENDING |
| Actual desktop/mobile layouts and accessibility | No browser tool exposed to agent | NOT TESTED |
| Hosted file picker/upload/annotations | API automation passes; native browser flow pending | NOT TESTED (browser) |
| Native PDF/PNG downloads | PDF bytes/rendering pass; browser handoff pending | NOT TESTED (browser) |
| Complete real-browser journey and independent Compass | DOM journey passes; owner walkthrough pending | NOT TESTED (browser) |
| Real second-customer account isolation | Site intentionally owner-only | NOT TESTED (browser); automated checks pass |

No new deployment, access-policy change or payment configuration was performed for this review. Browser-only failures must be reproduced and resolved before launch; passing automated tests does not close these items.
