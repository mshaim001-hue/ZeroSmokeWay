# Review: decision path and support implementation

2 November 2026. Read-only implementation review; no application fixes, migration, or remote data mutation performed. Local backend test: 37/37 pass; webapp: 69/69 pass; TypeScript/Vite build passes. This does not establish applied Supabase schema or live provider correctness.

## P1: authoritative stage is not checked by dialogue APIs

`backend/api/scene.js` and `backend/api/support.js` pass req.body to the dialogue service without authenticating the session or loading player_progress. Scene validation only rejects a body with appStage=support; support validation rejects a non-support value only when supplied. Sending journey or omitting the field bypasses these checks. Local validator calls confirmed that `{sceneId:'pitcher',message:'hello',appStage:'journey'}` and support `{message:'hello'}` are accepted. This is not a live provider call.

Consequences: after support starts the server does not actually prevent scene API calls; before confirmation the support API is callable. The SQL trigger prevents normal updates downgrading an already-support row, but does not establish API authorization. Verify session server-side, read the authoritative stage, and use that for both endpoint gates. Do not trust client smokingStatus for authoritative product state either.

## P1: stale client progress can reopen scenes or show obsolete timer state

`webapp/src/auth/progress.ts:151` picks a cache/remote winner through `newerEnvelope`; `progressModel.ts:266` compares only timestamps. Example: device B confirms support; a still-open scene tab A saves journey state later. The SQL trigger protects B's server stage, but A first writes its stale journey state locally with a later timestamp and ignores the upsert result. On A's reload, that newer journey cache can win over the remote support snapshot and AuthGate renders play. Equivalent same-stage stale snapshots can display an older abstinence interval/status after recording smoking elsewhere.

`refuseSceneDowngrade` only helps when the local cached current state already knows support. It does not resolve a newer journey cache against authoritative remote support. Lifecycle stage and intervals must be server-owned; client clock timestamps cannot override them. Handle unavailable/missing-schema reads explicitly rather than silently treating legacy/default state as authoritative. Test two tabs/devices and clock skew.

## P1/P2: chat persistence can overwrite cache with a stale lifecycle snapshot

SupportHome.tsx:53 launches saveProgress and saveSupportChat on every progress change. save_support_chat returns a FULL progress snapshot, and quitApi.ts passes it to applyQuitSnapshot, which unconditionally writes the cache with Date.now(). Its result is not applied to React state by this effect. An older in-flight chat save response can arrive after record_smoked/confirm and replace the cache with an old open interval or smoking status. Reload may then resurrect the obsolete timer due to timestamp-only conflict resolution.

Save chat without replacing lifecycle cache from its response, or use server revisions and reject stale responses; use one consistent merge path. SupportHome.speak also spreads a captured full progress object into the reply, so avoid reverting lifecycle changes while a model request is in flight. Add a meaningful delayed-response race test.

## P2: SQL confirmation/restart concurrency is not covered by the green tests

Migration confirm_last_cigarette reads progress/open interval without FOR UPDATE. The unique open-interval index prevents duplicate live intervals, but concurrent first confirmations can both see no interval and one can fail with a uniqueness error rather than returning the same state. Sequential JS idempotence is not concurrent RPC idempotence. Serialize by the user's progress row (consistent lock order) before checking/writing, and verify actual concurrent RPC calls. record_smoked with restart similarly has no operation id: replay after success may close the newly started interval and create another historical interval. Make retry semantics explicit and use a stable operation identifier if needed.

The migration accepts times up to two minutes in the future, whereas the report says future times are rejected. Decide whether this is documented clock-skew tolerance or strict rejection. Server time should be used for the now action if strictness is required. Do not claim zero future tolerance with this code.

## P2: body cards need timing/source corrections

`webapp/src/support/bodyCards.ts:13`: 20-minute card has afterHours=0, so is shown immediately. Either threshold at 20/60 hours or clearly present it as an upcoming milestone.

The one-year half-coronary-risk text cites https://www.cdc.gov/tobacco/about/benefits-of-quitting.html . The page currently describes added coronary-heart-disease risk halving at 3–6 years, with a different metric/baseline from this card. It does not support this exact one-year wording. The same CDC page gives carbon-monoxide change over several days, not the cited 12-hour milestone; find a source supporting each exact statement or align copy/time to the cited source. The NHS link returned 404 to the web retrieval tool; manually verify/replace the link before shipping. Review NRT relevance for each physiological statement, not only CO.

## What is implemented

- All 15 dossiers have added connection/contribution/objections/personal-meaning material and authored examples exist.
- Scene 15 exposes the self-declared readiness CTA after conversation starts; model offer changes emphasis rather than being the only access. This lets the user choose rather than requiring a model-approved answer.
- Confirmation UI offers now/past/Not yet and explicitly says another cigarette is unnecessary.
- RPC migration defines intent, confirmation, smoking event, intervals, RLS ownership, and a support-stage freeze trigger. user_profiles remains unchanged.
- SupportHome has a timestamp-based timer, a separate chat, past intervals, About, feedback, and sourced fixed cards. Feedback opens an email draft rather than silently submitting conversation.
- Text 'I smoked' only offers a recording action; it does not itself mutate the interval.

## Still requires verification

Apply the migration to the intended environment after fixes, then live Google flow: Not yet and reload; past-time confirmation; now confirmation; duplicate/retried/concurrent confirm; future input; home after reload/login; old scene tab after another tab confirms; delayed chat save after record_smoked; support conversation with real Meta; recorded lapse with/without restart; history and correct timer across devices.

Tests currently do not substitute for a real PostgreSQL migration/RPC integration test or a live UI pass. No claim that the migration is already applied or these changes are deployed was verified in this review.
