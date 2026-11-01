# Live test: Artem, first two scenes

Date: 2026-11-01. URL: https://www.zerosmokeway.life/.
Manual browser test, English only, fresh account. Fictional persona supplied by the user. No implementation changes. Earlier Russian session was abandoned and excluded.

## Coverage

- Completed introduction, watched scenes 1 and 2, conversed through both; stopped before scene 3.
- Scene 1: seven player messages. Next appeared after message five. Added a “Wait” clarification; model continued investigating. Explicit agreement then received another redundant invitation; clicking Next opened scene 2.
- Scene 2: five player messages, including a recovery request after malformed output. Next appeared after message two.
- Tested disagreement with bee metaphor, social smoking, six cigarettes on normal days versus twelve at parties, work breaks, previous ten-day attempt, two-week quit intention, readiness 6/10, supportive girlfriend, no peer ridicule in first experience, gradual progression to daily smoking.
- Asked about actual daily savings, price 1,000 KZT / 20, quit-date settings; model said these functions are not available here.
- Reloaded scene 2: current chat and Next button restored. Did not verify another-device sync or backend stored profile directly.

## Findings

### P1: Internal JSON shown as assistant message

Scene 2, fourth player message asks whether a two-week quit date and variable daily counts/savings can be tracked. Response is a visibly truncated JSON object containing reply, stance, next and memory entries, ending midway through a context property. User sees internal summaries, quotes and turnRef rather than just the intended reply.

Screenshot: raw-json.jpg. Full visible transcript: scene2-before-recovery.txt and scene2-final.txt.

Cause not verified. Truncation is observed; a model-output/token-limit or parse fallback issue is a hypothesis, not a diagnosis. Ensure invalid/incomplete structured responses never fall through into visible chat. Inspect generation finish reason, output size, parsing, validation, retry/recovery behavior and memory persistence.

Following user message requests plain language and no transition. Model recovers with normal prose. Reload retains the malformed message.

### P2: Redundant consent request

Scene 1 player explicitly says “That's enough on that for now; yes, let's look at how it started.” Assistant again asks “Want to look at how it started slipping into your days?” User must click Next. Does not unexpectedly navigate, but fails to acknowledge clear agreement naturally.

### Dialogue quality observations

- Accepts “I don't feel trapped” without forcing the metaphor.
- Accepts first cigarette without ridicule or severe unpleasantness; does not require film biography.
- Scene 2 correctly recalls two-week intention, readiness and wish not to avoid friends from scene 1.
- Responds to “Wait” with exploration rather than repeating the invitation.
- Scene 1 goes into stress/cessation-attempt questions; review whether these necessary clarifications are taking too much material from later scenes.
- Repeated formulaic openings: “Look”, “In your case”, summary followed by question. Scene 2 offers transition after two substantive answers; not automatically incorrect because origin was described clearly, but depth should be reviewed against authored dossier.
- Exposed memory includes openQuestion “What would be missed if gone?” although player already answered outside conversations, not taste. Possible stale open-question tracking.

## Limits

One persona, one English path; no clinical efficacy assessment. No evidence here that day-by-day counts, savings calculation, quit-date preparation or reminders work. These first two scenes expose conversations rather than those controls. No medical dependence determination tested or established. No claim that every memory field or deployed backend model was independently verified.
