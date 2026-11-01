# Live QA: Artem, scenes 3–15, 2026-11-01

Tested https://www.zerosmokeway.life/ through the visible UI, in English, continuing the existing natural-test account after scene 2. Fictional persona: Artem, 24, junior developer, social smoking and work stress, still smoking and considering stopping in two weeks. No code changed. A reload preceded this run; cache bypass was not independently verified. This is one live model run, not a broad regression result.

## Findings to give Cursor, in priority order

### P1: Generic dossiers contain the QA persona as purported memory

`backend/services/sceneDossiers.js:137` literally says “From memory: two-week intention, a ten-day stretch, white-knuckle, fear of promising. Continue from those words.” Scene 9 consequently opened: “You'd mentioned that ten-day white-knuckle stretch.” The saved natural scene 1/2 transcripts contain no ten-day attempt or white-knuckle description. Before scene 9 in this run Artem had not supplied those facts either. Ten days is in the test persona, but the model cannot know it from this account's dialogue. The player corrected “white-knuckle”; model accepted the correction.

Other generic dossiers embed bug/friends details (`:124`), six/twelve smoking pattern (`:149`), a two-week intention plus reasons (`:182`), and a ten-day stretch (`:193`). Audit ALL scene dossiers for copied persona details, including earlier scenes. These are generic instructions, not user memory.

Requested fix: replace them with conditional retrieval instructions; use a concrete detail only when actual account memory/history supports it. If absent, ask neutrally. Never turn a dossier example into “you said.” Do not require users to correct fabricated biography. Validate with a different persona who has never tried to quit, does not code, has no smoking friends, and has no two-week intention; the app must not introduce Artem's facts. Check provenance before treating any persisted derived summary as trustworthy.

### P1: Finale offers a nonexistent next scene

Scene 15, after one answer: “Want to watch the next scene, or stay with this a little longer?” No next button appeared. The dossier at `sceneDossiers.js:208` explicitly permits `next=offer` at end of path, which conflicts with the absence of a next film.

Requested fix: finale-specific completion behavior. No next-film language or offer when no next scene exists; provide an honest short wrap and a clear finish/pause action, optionally continue talking. The observed finale only exposes Watch again, Sign out, and reply field. On request, model said saved chat can be resumed and there is no separate quit-day support corner yet. Verify that capability statement against actual product before retaining it. Do not invent support or tracking features.

### P1: UI announces an outcome the user did not choose

Scene 13 heading “I am free”; scene 15 “You are free forever,” even though Artem explicitly remains a smoker. These come from `webapp/src/scenes/catalog.ts:231` and `:264`. The model itself accepts not being ready and does not require quitting. Neutral after-scene headings should agree with that behavior; remove unconditional freedom/permanence claims. Screenshots: scene13-heading.jpg and scene15-ending.jpg.

### P2: Scene boundaries do not reliably prevent repeat interviews

Scene 4 explores work-break before/during/after. Scene 5 again asks which part relieves tension, then asks what remains on returning to the bug. Scene 6 opens with the same return-to-screen question. Player: “That's pretty much what we were just talking about.” Model then correctly acknowledges the repeat and asks whether film added anything; player says no and moves on.

Scene 11 answers the patch question respectfully, then reopens automatic social smoking already explored at length in scene 8. Player again has to point out the repetition. Model accepts and moves on.

Requested fix: before composing an opener/follow-up, use topic depth and previous answer, not only a remembered noun. Already explored -> brief continuation or ask what the new film added. Stay within scene's distinct task. Do not make the user police repetition.

### P2: Misreading followed immediately by an offer

Scene 7 model said “you weren't choosing her over the chat” while describing Artem leaving his girlfriend inside to chat outside. Player corrected the reversal and rejected the “ticket to the circle” framing. Model acknowledged both, then immediately offered the next scene. Correction handling works, but basic semantic accuracy and room after correction need attention. Transcript scene07.txt.

### P2: Some summaries overstate tentative answers

Scene 10 labels an undecided idea “a real plan.” Player corrects it; model then accurately says “an idea on the table, not something you've tested.” Scene 8 changes “It doesn't feel like twelve separate decisions” into “that's not twelve separate choices.” Preserve experience/uncertainty rather than converting it into an objective fact. Repeated “if I'm reading this right” sometimes appears mechanically in questions where it adds nothing.

## What worked in this run

- No raw JSON appeared in scenes 3–15. This does not establish malformed-output recovery under forced failure.
- Scene 3 accepted that cigarette advertising was not part of Artem's memory.
- Scene 4 accepted disagreement with the tight-shoes analogy and uncertainty about pleasure versus relief.
- Scene 6 accepted “not bored; putting off something difficult” and did not force more discussion.
- Scene 8: after an offer, a new worry removed the buttons. Model stayed with fear of not trusting a sober decision, asked follow-ups, and did not immediately re-offer. Later “Yeah. Let's go on.” naturally launched scene 9.
- Scenes 9/10 did not declare past effort or cutting down worthless. Scene 9 acknowledged lingering shame, though briefly before offering.
- Scene 11 explicitly said a patch still counts as stopping smoking, gave no dose or instruction to abandon help, and respected consulting a pharmacist.
- Scene 12 accepted that cravings can feel large, without a guaranteed duration or demand to agree with the monster image.
- Scene 13 let an explicitly not-ready smoker proceed; no vow or last cigarette required.
- Scene 14 used the past attempt rather than assuming current abstinence, and explored a practical lunch break plus support from girlfriend/friends.
- All requested scene transitions succeeded; scene 15 chat and position survived a reload.

## Evidence / coverage

Full visible UI transcripts saved for scenes 03–07, 09–15. Scene 08 was not exported before its natural text agreement automatically navigated, so it is summarized here rather than presented as a complete transcript. In scene 8 player described six becoming twelve on Friday, early smokes for switching off/socializing, later automatic ones. After the first offer, player worried about abandoning a sober decision after drinks. Model explored it, player named keeping the evening going and no actual friend pressure, model acknowledged; player later requested to go on. Screenshots saved for 13 and 15. Existing natural-test scene 1/2 transcripts are in ../artem-natural-2026-11-01/.

This run covers one continuing account and one persona. It does not verify internal memory records, other accounts, alternate safety scenarios, real quit outcomes, or mobile viewport layouts.
