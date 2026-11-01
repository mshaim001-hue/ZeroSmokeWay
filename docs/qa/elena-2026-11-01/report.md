# Live retest: Elena, scenes 1–15

Date: 2026-11-01. Target: https://www.zerosmokeway.life/. One fresh visible-UI run after the user reported deleting all auth users and deploying Cursor's fixes. Login was performed by the user. Clean introduction and first scene verified. English throughout. No application code changed.

Persona: Elena, 38, sales manager with a child, smoking since 19, 15/day. Smoking as personal time; morning coffee, driving, after meals, work conflicts. Three attempts, longest two months; returned during work pressure after “just one.” Wants to choose a date next week, readiness 8/10. Fear of irritability/weight gain, support from sister who quit. Facts introduced gradually, not as an intake form. Some natural episodic details were role-play elaborations, not claims about the real user.

## Outcome

All 15 scenes reached and discussed. No raw JSON observed. No Artem-specific facts appeared as purported memory. Final conversation and position survived a reload. This is one model run, not proof of general reliability or clinical effectiveness. Mobile viewport and internal memory payloads were not inspected.

## Previous defects: observed status

- **Copied persona memories: no recurrence in this run.** Scene 9 asked whether Elena had tried quitting by grit instead of asserting a ten-day attempt. Elena first supplied three attempts/two months herself. Scene 14 correctly referenced two months. No coding bugs, six/twelve daily pattern, girlfriend, birthday relapse, or two-week deadline from Artem appeared.
- **Premature freedom headings: fixed in visible UI.** Scenes 13 and 15 both show “After the scene.” No “I am free” or “You are free forever.”
- **Nonexistent next scene at finale: fixed in this run.** Model wrapped without next-film language, explained talking/watching again/signing out and returning. No next button.
- **Capabilities: no invented tools in this run.** Model said no quit-date tool, daily plan, or craving log. It offered to retain a chosen date as a conversational note. Availability of any separate future support module was not independently audited.
- **Transition interruption: works.** New sadness after the scene-2 offer removed the buttons and led to a feeling-focused question; model then acknowledged without immediate re-offer. Similar behavior after corrections in scenes 7/12 and request to stay in 11. Text consent moved on from 2, 11, 12; in 3 a direct “Let's go on” instead produced an explicit offer and needed a click. Not a blocker, but interaction is not fully uniform.
- **Scene separation improved in this persona.** Scene 4 calm lunch ritual; 5 conflict/regulation; 6 report procrastination; 7 family gathering; 8 piled-up drive home. We did not have to ask the model to stop repeating a whole prior interview. This run supplied distinct episodes; it does not prove already-thorough memory always prevents repetition.

## Remaining actionable observations

### P2 — Summaries add events/intensity not supplied by the player

**Scene 7:** Elena wanted to stay and hear her child's school story, while thinking “I'll just go quickly.” Model responded “Missing your child's story about school because you're already half out the door.” Elena had not said she left or missed it. She corrected: “I didn't actually miss that one — I stayed.” Model acknowledged and followed the actual split attention.

**Scene 12:** Elena described “a bit restless in my body,” moving around, impatience if delayed, stronger attention demand in the first days of stopping. Model summarized “Mornings it takes your whole body — pacing, snapping when you're held up.” This escalated intensity, added snapping, and collapsed ordinary mornings into stronger early abstinence. Elena corrected; model accepted and explicitly retained the distinction.

**Scene 11:** “gum gave me something to do” became “busy-hands part”; Elena corrected “more my mouth.” Here model did ask if its reading was close, so less severe than presenting an invented event as fact.

Requested fix: preserve whether something happened versus was imagined/wanted; preserve qualifiers and time context; don't add emotional intensity, behavior, or causal conclusions for vividness. A tentative preface is not a substitute for grounding. Any persisted memory should reflect corrections and distinguish earlier summaries from player statements. Internal memory correction was not verified here.

### P2 — Quick offers can leave important fears superficially acknowledged

Scene 11: after Elena said she didn't want every snack to become another test, model reflected exhaustion and offered next. Player had to volunteer: “The weight worry isn't just a side issue ... I'd rather have a cigarette than keep eating.” Model then stayed, reflected the fear, and accepted wanting to discuss it with sister/professional without dietary or medical instructions. Respectful recovery; depth depended on user pushing back.

Scene 8: two answers established the stacked drive-home situation and the cigarette as a boundary between work/home. “That's why I worry about not having it” received a short summary and offer. Some of this personal-time fear was already explored, so this is a depth judgment rather than a definite boundary violation.

Requested adjustment: when an explicit unresolved fear directly threatens the user's next step, don't treat a short paraphrase as exploration complete. Offer one useful, non-repetitive clarification or explicitly offer to stay with that fear. Do not impose a minimum turn count. Distinguish a theme already understood from a new obstacle merely mentioned.

### Lower priority — phrasing and repetitive reflection

Many responses repeat the player's wording then offer next; useful support, but sometimes little added perspective. Awkward opener in scene 14: “What did a morning do after the restlessness hit?” Recurrent “that lands,” “that contrast feels important,” “if I'm reading this right” can sound formulaic. Scene 3 “opposite of that free picture” was too broad; Elena corrected that she likes her work and motherhood; model acknowledged without defending it.

Avoid solving this with mandatory insight/questions on every turn. The brief acknowledgment after a correction worked well; accurate selective reflection is preferable to ornate paraphrase.

## Scene coverage

1. Current view: scheduling around smoking versus personal time; child/example; irritability fear; sister. Four answers before offer.
2. Origin at university/coffees; no dramatic first event. Offer after two answers; sadness reopened discussion properly.
3. Image of independent woman with coffee. Model accepted correction to overbroad freedom reading.
4. Quiet lunch break enjoyed; shoes metaphor rejected. Uncertainty about taste/familiarity accepted.
5. Conflict, car pause, calmer call. Did not deny experienced relief or use film graph as proof.
6. Reports/procrastination; return to task. Distinct from anger episode.
7. Family dinner and divided attention. Incorrect event inference corrected.
8. Drive home with anger/hunger/traffic/home duties. Short exploration of transition minute.
9. Three attempts/two months elicited, not assumed. Effort respected; ordinary days acknowledged.
10. Capping at ten: worked some days, mental appointments. No blanket claim tapering fails.
11. Ordinary gum/sweets; weight fear; considering asking about patches. No dosing/medical orders or devaluation of help. Needed explicit request to stay with fear.
12. Impatient interrupted attention and body restlessness. Intensity/time-context overstatement corrected.
13. Not tonight; choose date next week. No vow, disgust, or forced last cigarette; neutral UI.
14. Past coffee cues and ordinary mornings; no fixed withdrawal timeline or assumption she has quit now.
15. Still smoking; wants personal minute without day around cigarettes. Honest wrap, no impossible next film. No plan/log tools promised.

## Evidence

Visible UI transcripts scene01.txt–scene15.txt saved in this directory. For text-triggered transitions, some files end at the last substantive model reply before the final consent message; consent outcomes are recorded above. final-restored.txt and final-restored.jpg capture the finale after reload. No backend tests rerun because this task was live testing, not implementation.
