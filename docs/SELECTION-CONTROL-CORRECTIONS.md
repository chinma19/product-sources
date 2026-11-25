# Approved selection-control corrections

25 November 2026 · `codex/editorial-integration`

This release implements the owner's approval of the [selection audit](SELECTION-CONTROL-AUDIT.md). It is for the separate owner-private integration preview, before the final controlled rollout.

## Behaviour

The following six fields now use exclusive radio choices while retaining their existing `checks` type, IDs, literal questions/options and array-shaped saved answers:

- Step 26: `p26.choices1`
- Step 38: `p38.choices1`
- Step 45: `p45.choices1`
- Step 49: `p49.choices1`
- Step 52: `p52.choices1`, `p52.choices2`

Choosing B after A immediately selects only B, and saves `[B]`. Unanswered arrays remain valid; these are not new compulsory questions. A customer can deliberately clear a normal answer and return later. Step 52 retains its original two Lifestyle options, Sometimes and Not really.

All six reviewed ambiguous groups retain multiple selection, together with all 25 other legitimate groups. No question, answer option, manuscript line, scoring band, synthesis rule, colour exception or final-inheritance binding was changed. The content-import overlay reproduces exactly the six new `selectionMode: "single"` attributes.

## Existing answers and compatibility

An existing conflicting array is never reduced automatically. The exercise lists its recorded selections in a concise review panel and leaves the radios unselected. Only a deliberate new choice replaces that answer. Unrelated edits, navigation, saving, exports and resuming preserve unresolved arrays.

New ordinary selection writes validate uniqueness and the approved per-field cardinality. Explicit answer-backup restoration and encrypted local recovery carry a bounded restoration marker for older, structurally valid arrays. This marker is validated on the server and is never stored as customer content. Choosing a replacement removes that field's marker, including when an earlier restoration request fails while a newer selection is pending.

Stale recovered drafts continue requiring the existing explicit local-versus-server decision, including after another reload. Confirmation snapshots and deliberate final overrides remain unchanged by selection corrections. No schema version change, database migration, customer-data rewrite, image operation, authentication change, payment change or access-policy change is included.

## Verification

- Production build: passed.
- New selection regression suite: **15 passed, zero failed or skipped**.
- Complete regression suite: **130 passed, zero failed or skipped** (`npm test`, about three minutes).
- Independent review: no blocking issue found.

The new tests use the actual client, Worker and temporary isolated D1/R2 with synthetic accounts. They cover immediate replacement and saving/reopening for every corrected field; contextual edit-and-return updates; saving/reopening all 31 retained multi-selects; exact question/option fingerprints; invalid new writes and restoration markers; preservation of existing conflicts; actual answer-backup import; encrypted recovery across stale revisions; the failed in-flight restore/replacement race; confirmed wording and deliberate overrides; and Master/One-Glance PDF downloads.

The existing full suite additionally exercises the complete 68-step journey, partial completion, account isolation and batch photo functionality. These automated DOM/API checks are not a physical mobile or native-browser acceptance claim.

## Browser acceptance item

This chat does not expose browser control. The Style Compass native-browser save/reopen check therefore remains outstanding; no browser pass is claimed. The earlier simulated-browser discrepancy is documented in the audit and is not a confirmed application defect.

In the private preview, open the independent Style Compass, select one decision, then select another. Save, leave and reopen it; verify that the second decision remains selected. Repeat from Step 66 if desired. Use synthetic test responses for acceptance testing.

## Private publication

Target: https://inherfashion-integration-review.fabulousloon.chatgpt.site

Native publication succeeded for the existing integration Site `appgprj_6b057ae4ed348191af2e0da0149f781d`, now **version 2**.

- Application source commit: `0f7676455d1f5583deda920ff4fd1c4378557bb9`.
- Published deployment-source commit: `3b92ceb441f9856c92595a9c2fd4f96149b0974d`.
- Deployment: `appgdep_6b06a5fff45c8191ba65956f83058372`, status `succeeded`.
- Worker SHA-256: `5d1d94e12e338ac3d2b5bbbb598254d7ab0c7a588295352edb47a80e6f391d61`.
- The deployed application JS/CSS and runtime sources match the tested application. The Worker bundle differs only in dependency source-path labels from the separate source checkout. The deployment archive's Worker, integration identity and unchanged migrations were verified against that checkout.
- Original Site remains **version 4**. Both sites retain access-policy revision **1**, one allowed owner account and zero external visitors; their policies matched the pre-publication reads exactly.
- Read-only before/after comparisons found the integration preview's complete progress and evidence rows unchanged. No customer answer or photograph was created, restored, edited or removed during publication.
- An unauthenticated request to the updated preview returned **401**.

There are no failing automated tests. The native-browser Compass check above remains manual acceptance work. No final rollout to the original version 4 Site has been authorized or performed.
