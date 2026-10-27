# ZeroSmokeWay

Mobile cinematic path about the nicotine trap: a short film, then a live conversation with Meta Muse Spark. The model does not lecture and does not run a questionnaire. It stays with the player’s words and decides whether to hold, probe, or open the next scene.

Not an “AI quit-smoking coach.” Existing apps already explain harm. This project uses fairy-tale images so a person can name the private reason they keep smoking.

## Run locally

Node.js 22.18+ or 24+. Two terminals:

```bash
npm ci --prefix backend
npm start --prefix backend
```

```bash
npm ci --prefix webapp
npm run dev --prefix webapp
```

Open the Vite URL (usually http://localhost:5173). It proxies `/api` to localhost:3000.

Put `MODEL_API_KEY` in `backend/.env` (Meta Model API, `muse-spark-1.3`). See `backend/env.example`. Never commit the key.

## Checks

```bash
npm test --prefix webapp
npm run build --prefix webapp
npm test --prefix backend
```

## Structure

- `webapp/src/scenes/` — cinema + full-screen chat; live product starts here.
- `backend/services/sceneDialogue.js` — Meta Muse dialogue and routing.
- `backend/services/speechProfile.js` — hardcoded speech profile.
- `api/scene.js` — Vercel entry; `vercel.json` builds `webapp/dist`.
- `webapp/src/game/` — previous Labyrinth (Phaser rooms). Not shown in the live app.
- `docs/design/` — current scene design; `docs/hackathon/` — submission notes; `docs/archive/` — history.

No accounts, cloud sync, or service worker in this build. Gmail auth is deferred. Effectiveness for quitting has not been tested with participants.

## Hackathon work

Meta Global AI Developer Hackathon 2026. Track: **Indie Developer**. Theme: **Build for Your World**. Bonus categories to mark: **Best Agent Use Case**, **Best Creative Build**.

Deadline: 4 November 2026, 9:00 PM ET. Branch: `hackathon-2026`.

### Prior work (before 26 October 2026)

Concept, research, and the Labyrinth prototype already existed: Phaser gesture rooms, corridor map, OpenAI room chat with authored fallbacks. Last pre-hackathon commit on `main`: `2e1c89a`. That layer is frozen. Judges should not score it.

### Built during the hackathon

- Scene-by-scene mobile path (4 acts / 15 scenes planned). One scene finished before the next starts.
- Act 1 Scene 1 — *Garden of the Pitcher Plant*: cinema, then full-screen Meta chat. Bee = “I only wanted to try / I can stop whenever I want.”
- Act 1 Scene 2 — *The First Disgusting Cigarette*: flashback in a crowd — first drag, cough, they laugh, he keeps smoking so he will not look like the fool.
- Act 1 Scene 3 — *The Brainwashing Labyrinth*: a city of giant ads; last-request, sport, and romance myths; the talk names the manipulation.
- Act 1 Scene 4 — *The Tight Shoes Paradox*: the only pleasure is taking off shoes that hurt; that relief is the cigarette.
- Act 2 Scene 5 — *Boss: Stress*: office crunch; a cigarette for calm; the anxiety graph climbs instead.
- Meta Model API (`muse-spark-1.3` at `https://api.meta.ai/v1`) as the dialogue core. No prepared questions, no fake replies when the model fails.
- Hardcoded assistant speech profile (peer, short, match user language).
- Muse returns a **decision**, not only a line: `hold` / `probe` / `release` / `advance`. The server, not the client, decides whether the next scene may open.

Draft for the submission form:

> Existing project concept and a Phaser labyrinth existed before the event. During the hackathon I replaced that loop with cinematic scenes and a Meta Muse agent that talks after each film, tracks how to lead the player, and unlocks the next scene when they connect the image to their own smoking.

Suggested one-line impact: people do not keep smoking because they lack facts; they keep a private story. ZeroSmokeWay makes that story visible.

Submission checklist and credit links: [docs/hackathon/submission.md](docs/hackathon/submission.md). Demo voiceover: [docs/hackathon/demo-script.md](docs/hackathon/demo-script.md).

[Scene 1](docs/design/act1-scene1.md) · [Scene 2](docs/design/act1-scene2.md) · [Dialogue](docs/design/scene-dialogue.md)
