# Follow-up implementation review

Local backend 43/43, webapp 70/70, TypeScript/Vite build pass. Review only; application code and remote database unchanged. User reports the earlier missing can_advance/memory/offer_open columns have been added; this review does not independently verify remote schema.

## Remaining findings

### P1/P2: support memory updates are not persisted

SupportHome.tsx:77 stores reply.memory in React state, but its persistence effect (:52–57) only calls saveSupportChat(chat). The new RPC in 20261102140000_support_locks.sql:131 updates support_chat and updated_at only. AuthGate.onProgress only sets React state. No path persists the updated memory, or updates the local progress cache for support replies. On reload, the new support memory/corrections are lost, although text chat can restore. Once bounded chat history drops a detail, it is also absent from durable memory.

Fix with a bounded authenticated support-content save (chat plus merged memory) that never mutates lifecycle fields. Surface a save failure rather than swallowing it if the UI claims persistence. Verify a corrected note remains after reload with the relevant original turns outside the sent history.

### P2: an already-mounted SupportHome ignores refreshed lifecycle props

AuthGate.tsx:43–50 reloads progress on visibilitychange and passes updated initial props to SupportHome. SupportHome.tsx:32 uses initial only in useState initialization; there is no prop reconciliation effect/key. If tab A already shows support, tab B records smoking, and A becomes visible, parent/cache can contain the new smoking state while A continues rendering its old live interval. Reply merge is now functional, but this does not synchronize incoming authoritative snapshots. Merge new lifecycle state into the mounted child, without discarding unsent draft/in-flight chat, and verify two support tabs.

### P2: scene API still permits access when authoritative lookup is unavailable

playerStage.js: readAuthoritativeStage returns configured=false/empty stage when server Supabase settings are absent, and journey/schemaComplete=false on a non-401/403 progress read failure. gateDialogueRequest('scene') rejects only appStage=support, so these unknown cases are allowed. Body spoofing is fixed, but the gate still fails open on configuration/schema/server errors. Return a clear unavailable/configuration error when the real stage cannot be read; keep successful no-row lookup distinct from a failed query. Verify unknown lookup never invokes Meta, while support returns 409 only when the stage is actually known to be support.

## Confirmed improvements

Bearer session + authoritative stage lookups, client Authorization headers, remote lifecycle wins over a newer journey cache, chat save no longer writes a full timer snapshot to cache, functional current-state reply merge, SQL row locks and server now for the now action, two-minute entered-time allowance, bounded restart replay protection, and corrected fixed body-card thresholds/source references are present. The sequential smoke-free flow is ready for live checking, but these remaining findings prevent describing the complete implementation as finished.

No real PostgreSQL concurrency, multi-device, Google re-login, live support model, or body-card milestone transition test was performed in this follow-up code review.
