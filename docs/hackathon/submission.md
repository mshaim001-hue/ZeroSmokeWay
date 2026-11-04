# ZeroSmokeWay — submission pack

Updated 4 November 2026. Draft, not a submitted entry.

## Event and assets

- Official event: https://dev.meta.ai/events/global-hackathon
- Portal: https://cerebralvalley.ai/e/meta-ai-developer-hackathon
- Deadline: **4 November 2026, 21:00 America/New_York = 5 November, 07:00 Asia/Almaty**.
- App: https://www.zerosmokeway.life/
- Public repo: https://github.com/mshaim001-hue/ZeroSmokeWay — **main**, MIT. Public visibility verified 3 November via GitHub API.
- Demo video: https://youtu.be/4fCHfgi8CLM — watch page and playback checked 4 November; YouTube displays **3:00** and **Unlisted**. Signed-out playback has not been independently verified.
- Optional viral-prize X post: **link not supplied or verified yet**.
- Recommended track/theme: **Indie Developer / Build for Your World**; confirm against the accepted application.
- Potential bonus: **Best Creative Build**. Consider Best Agent Use Case only if the actual form and criteria fit the model's routing role. Hosted Spark alone is not evidence of open-weights eligibility.
- Team: confirm the approved roster in the portal.

The logged-out portal exposes the public event page, not the submission form. Exact fields, limits, required declarations and bonus options still need checking after sign-in. The supplied kickoff transcript requires a three-minute voiceover demo, a public repo, and disclosure of prior work.

## One-line description

Fifteen cinematic scenes and personal AI conversations that help smokers examine what keeps them smoking, followed by a smoke-free tracker and ongoing support.

## Problem and motivation

I know smoking from personal experience. Knowing the risks is not always enough to change the rituals, expectations and fears attached to a cigarette. Reading Allen Carr's book once changed how I saw smoking. ZeroSmokeWay explores whether short visual metaphors and a conversation about each person's own experience can make that reflection more personal and interactive.

## What I built

ZeroSmokeWay is a mobile-first web app with fifteen cinematic scenes across four acts. After each scene, the user talks about their own experience: how smoking started, what they value in it, triggers, previous approaches, and their current willingness to stop.

Meta Muse Spark uses a scene dossier, conversation history and persistent memory to respond and decide whether to stay with a thought or offer the next scene. An offer is separate from the user's agreement to move on. Users may reject the metaphor or remain unsure; agreement with a prescribed lesson is not the goal.

At the end, a user confirms when their last cigarette happened, or chooses Not yet. Only confirmation opens the support home and starts the count. Today and Progress show smoke-free time, optional savings estimates and sourced general milestones. Support continues with a server-built player card from stored memory. Recording smoking and changing the timer are explicit product actions, separate from model replies.

## How Meta AI is used

The backend calls Meta Model API with Muse Spark (code default muse-spark-1.3; confirm the deployed model setting). The model returns a spoken reply, structured routing and memory updates. Each scene has a main theme, boundaries for future topics, possible objections and transition criteria. Memory distinguishes player statements from model hypotheses and retains corrections. The server validates output, merges memory and enforces stage boundaries. Support loads the authenticated user's memory and status server-side.

The timer, estimates and milestone copy are deterministic features. Films were generated and edited with external creative tools; do not attribute their generation to Meta. Meta's role is dialogue, structured routing and memory updates.

## Stack and technical depth

React, TypeScript, Vite; Node.js API functions on Vercel and an Express local server; Supabase Google auth, Postgres progress/memory and lifecycle RPCs. Meta calls stay on the backend. A shared budget covers transient retries and invalid-output repair; errors are shown rather than replaced with fabricated fallback dialogue. SQL row locks protect lifecycle writes. See readiness.md for remaining chronology and live-provider concerns before claiming production reliability.

## Prior work disclosure — ready to paste

This repository and the smoking-related concept predate the hackathon. Before the event, the project included a Phaser labyrinth prototype and existing web/backend infrastructure. The baseline commit is 2e1c89a (5 October 2026). The first cinematic-path hackathon commit is 8d6142b (27 October 2026).

During the hackathon I built the fifteen-scene cinematic experience, per-scene dialogue dossiers, Meta dialogue routing and structured memory, Google-authenticated progress for this path, last-cigarette confirmation, and the post-quit home with support conversations, estimates and sourced milestones. The old labyrinth is not the submitted demo. The demo shows only the new experience.

Development scope: https://github.com/mshaim001-hue/ZeroSmokeWay/compare/2e1c89a...main

## Results and limits

The project is deployed and has been exercised with fictional user journeys, including all fifteen scenes in the preceding Alex pass. Local checks repeated after repository cleanup on 4 November: 46 backend tests, 58 webapp tests, TypeScript/Vite production build passed. These are product QA, not evidence of quitting effectiveness.

Live provider reliability and restart chronology remain release concerns in readiness.md. Do not claim all live checks passed. This app is inspired by Allen Carr, is not affiliated with his organization, and does not reproduce his book. Effectiveness of this app has not been established.

## Judge access

Open https://www.zerosmokeway.life/ on a phone or narrow viewport and continue with Google. A fresh account starts at the introduction and scene 1; returning accounts resume. Chat is English. Verify Google sign-in and both Meta routes before recording.

Use the three-minute video to show the full arc. Clearly label cuts between genuine interactions; do not fabricate answers or present edited waiting time as real-time latency.

## Final gate

- [ ] Resolve critical issues in readiness.md.
- [x] Record and upload the three-minute voiceover demo.
- [ ] Independently verify signed-out video access.
- [ ] Sign into portal and check exact fields, accepted track and team.
- [ ] Paste final video and public repo URLs; disclose prior work.
- [ ] Add chosen X URL if entering viral category.
- [ ] After user submission, retain confirmation and project gallery URL.
