# Submission readiness — 3 November 2026

**Historical audit, 3 November; not a current deployment verdict.** The submission text and recording script are prepared; two live product problems and the final video/form remain open. Code inspected at `193f651` on `main`. No application code was changed during this audit.

The final demo is now available: https://youtu.be/4fCHfgi8CLM (4 November). Findings below require a separate live retest before being marked resolved. Local screenshots and disposable-account logs are excluded from the public repository.

## Evidence and scope

Sources: supplied kickoff transcript (13:18–25:41), [Meta event](https://dev.meta.ai/events/global-hackathon), [Cerebral Valley event](https://cerebralvalley.ai/e/meta-ai-developer-hackathon), repository, current production UI. Transcript may contain transcription errors; exact submission form remains authoritative for its fields.

| Requirement / check | Status | Evidence / action |
|---|---|---|
| Deadline | Confirmed | 4 Nov 21:00 ET = 5 Nov 07:00 Almaty |
| Public GitHub | Pass | GitHub API: public, default branch main, MIT |
| Prior work disclosure | Prepared | Existing repo/prototype explicitly disclosed in submission.md; baseline 2e1c89a, cinematic work starts 8d6142b |
| Track and theme | Draft | Indie Developer / Build for Your World; reconcile with accepted registration |
| Team approval | Unverified | Check the approved roster in the portal |
| Concrete Meta contribution | Present in code | Live dialogue, routing and memory updates, server validation |
| Three-minute voiced demo | Missing evidence | Script prepared, no video/upload URL verified |
| Actual submission form | Unverified | Logged-out public portal exposes no submission fields; user sign-in needed |
| Backend tests | Pass | 46/46, npm test --prefix backend |
| Webapp tests | Pass | 58/58, npm test --prefix webapp |
| TypeScript / production build | Pass | npm run build --prefix webapp |
| Fifteen-scene path | Earlier pass completed | All 15 played in Alex pass before latest changes; no fresh full 15-scene pass in this audit |
| Latest UI regression | Pass for inspected items | Talk it through; no four quick prompts; account name/email in menu; About no longer has Watch the first film |
| Server-built support card | Code present, live blocked | Server loads authenticated progress memory; reply to recall request repeatedly failed |
| Standalone smoking record | Pass live | Progress action stops the count even while model replies fail |
| Restart chronology | FAIL live | Restart at 16:00 accepted after interval ended 16:10:20 on 3 Nov |
| Support model | FAIL live | Repeated /api/support 503 model_unavailable |
| Quit-effectiveness claim | Not established | Fictional QA is not an outcome study; avoid proven quit rates |
| X / viral category link | Unverified | Need chosen public post URL if entering |

## P1 — support route fails in production

Current deployed UI was verified (new labels and removed quick prompts). Asked the existing Alex support account: “Before we go on, what do you remember about me from the scenes? In particular, what have I actually tried and what am I only planning to do?” Initial send and retries failed. Captured retry: HTTP **503**, `{"error":"unavailable","issue":"model_unavailable"}`. Screenshots and response captures are retained in the local QA archive.

The local code maps provider HTTP 404 or code model_not_found to model_unavailable. This public response does not establish the exact upstream cause. Inspect the new sanitized Vercel `[meta]` log fields for the support invocation: status/code/type/requestId/message; compare resolved model, API base and deployment env with a working scene invocation. Never put keys or user prompts in logs. Longer timeouts do not repair a missing-model response.

Acceptance: several genuine support replies succeed, including recalling actual attempts versus planned actions; reload and a correction preserve the right picture. Do not claim the internal card is live-verified until this succeeds.

## P1 — restart can overlap an earlier interval

Live reproduction on the disposable Alex QA account:

1. Existing interval: **3 Nov 15:18:01 → 16:10:20** (52 minutes).
2. Progress → I smoked — update status → I smoked, stop the live count. Succeeded without the LLM.
3. Progress → Start a new count → enter **3 Nov 16:00** → Use this time.
4. App accepted it and added the new active interval to the old one in totals, although they overlap by ten minutes.

Evidence is retained in the local QA archive. Test data remains in this QA account; do not use its totals as real-user outcome evidence.

`supabase/migrations/20261102140000_support_locks.sql:53–63` checks future time but not prior interval chronology. Add a NEW forward migration; editing an already-applied migration alone will not fix production. Under the same per-user lock, reject a restart before the latest recorded smoking boundary/previous interval end. Apply equivalent checks to any RPC that closes/restarts intervals. Keep idempotency/concurrency behaviour. Show a clear UI error. Prevent overlapping intervals at the database level where practical, and separately correct existing disposable QA data only through an explicitly authorized recovery path.

Acceptance: restart before the last recorded cigarette rejected; equal boundary / later valid times handled consistently; no double-counted totals; live two-tab lifecycle rechecked.

## P2 — player-card kind can mislabel a plan as fact

Read-only local reproduction with buildPlayerCard:

`source=player, status=current, summary=quote="I might ask a pharmacist tomorrow."`

Output is in planned_actions but has **kind=fact**. The prompt calls fact “confirmed player material”, so the model receives conflicting semantics. The intention was said, but its action did not happen. Keyword matching in playerCard.js:44–51 misses this form. Preserve a reliable temporal/modality distinction; unknown/ambiguous should not silently become a completed event. Add meaningful checks for tomorrow, might/could, negation, and corrections.

## Other pre-submission work

- GitHub repository homepage metadata still points to an old Vercel address, and description is empty. Change homepage to https://www.zerosmokeway.life/ and add a concise description before sharing with judges.
- Check the actual model identity in production. Do not claim an open-weights prize solely from hosted muse-spark-1.3 usage.
- Recording must demonstrate the new cinematic product, not the pre-event labyrinth. No invented model replies; label cuts/wait edits.
- Obtain a final three-minute video URL and validate signed-out access with sound.
- Sign into the submission form early; check exact field limits, declarations, required images and categories rather than guessing from the public page.
- The hydrated logged-out event page displayed a disabled **Event Closed** button while its text still gives the Nov 4 deadline. Do not interpret that label alone as proof that submission is closed; verify the accepted participant's authenticated submission access or ask organizers.
- Confirm fresh Google access for judges and final production migrations/env; do one final path after fixes. Earlier full-pass QA is useful evidence but not a clean retest of this latest build.

## Cursor handoff

Fix support provider failure with sanitized upstream evidence; add/apply chronology migration plus boundary checks; correct player-card future modality; then run local checks and a real Meta regression. Keep the current independent Progress status action. Once live checks pass, update this verdict and record the demo from the repaired build.
