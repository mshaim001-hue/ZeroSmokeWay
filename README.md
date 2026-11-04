# ZeroSmokeWay

Mobile cinematic path about smoking: short films, then a live talk after each one. Production: [https://www.zerosmokeway.life](https://www.zerosmokeway.life).

It is not a quit coach, not a questionnaire, and not medical advice. Effectiveness for quitting has not been tested with participants.

[Watch the three-minute demo](https://youtu.be/4fCHfgi8CLM) · [Hackathon submission](docs/hackathon/submission.md) · [Architecture](docs/hackathon/architecture.md)

## What the product does

1. **Fifteen scenes** (4 acts). Watch a short film, then talk in full-screen chat. The next film opens when that scene’s main theme has been looked at — not via a skip button.
2. **Last cigarette.** On the final scene the player can confirm a last cigarette (or say not yet). That opens the support home and can start a smoke-free count.
3. **Support home** (Today / Progress / Support): live count, optional estimates, milestones with sources, free-text talk, and a Progress action to record that they smoked — without needing the model.

Dialogue uses Meta Muse Spark (`muse-spark-1.3` at `https://api.meta.ai/v1`). Living memory and an internal player card (not shown in the UI) are stored in Supabase and loaded on the server for support. The client does not invent stage or timer from local cache alone.

## Run locally

Node.js 22+. Two terminals:

```bash
npm ci --prefix backend
npm start --prefix backend
```

```bash
npm ci --prefix webapp
npm run dev --prefix webapp
```

Open the Vite URL (usually http://localhost:5173). It proxies `/api` to localhost:3000.

Copy `backend/env.example` → `backend/.env`. Set at least:

- `MODEL_API_KEY` — Meta Model API key
- `META_MODEL=muse-spark-1.3` (optional; whitespace is trimmed)
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` — required for `/api/scene` and `/api/support` (stage is read from `player_progress`, not from the request body)

Webapp: `VITE_SUPABASE_URL` and the anon/publishable key in `webapp/.env`. Never commit keys.

## Checks

```bash
npm test --prefix backend
npm test --prefix webapp
npm run build --prefix webapp
```

## Structure

| Path | Role |
|------|------|
| `webapp/src/scenes/` | Films + scene chat |
| `webapp/src/support/` | Post-quit home |
| `webapp/src/auth/` | Google sign-in, progress load/save |
| `backend/services/sceneDialogue.js` | Scene talk and offer/launch routing |
| `backend/services/supportDialogue.js` | Support talk + player card from server memory |
| `backend/services/playerCard.js` | Internal card built from living memory |
| `api/scene.js`, `api/support.js` | Vercel entries (`maxDuration` 120s) |
| `supabase/migrations/` | Progress, support stage, locks, estimates |
| `docs/design/` | Per-scene design notes |
| `docs/hackathon/` | Meta hackathon submission notes |
| `webapp/public/about.html`, `feedback.html` | Static pages from the in-app menu |

## Progress and migrations

For the current cinematic app, apply these migrations in order (Supabase SQL editor or CLI). See [migration guide](supabase/MIGRATION_GUIDE.md). Earlier migrations are retained as historical records; they belong to the previous prototype.

- `20261030000000_player_progress.sql`
- `20261031120000_dialogue_memory.sql`
- `20261101170000_offer_open.sql`
- `20261102120000_support_stage.sql`
- `20261102140000_support_locks.sql`
- `20261102150000_save_support_content.sql`
- `20261102160000_quit_estimates.sql`

Signed-in progress lives in `player_progress` (source of truth) with a local cache on the phone. Support chat and memory persist via `save_support_content` without rewriting the timer.

## Google auth (Supabase)

Google Cloud holds the OAuth *client*. Supabase is the callback. The app domain does not go in Google’s redirect list.

### 1. Google Cloud → Credentials → Web client `ZeroSmokeWay`

**Authorized JavaScript origins** (no trailing slash):

- `http://localhost:5173`
- `http://localhost:5174`
- `https://zerosmokeway.life`
- `https://www.zerosmokeway.life`
- `https://zerosmokeway.vercel.app`

**Authorized redirect URIs** — only the Supabase callback:

- `https://uakgprwpnrykzatqylhy.supabase.co/auth/v1/callback`

### 2. Supabase → Authentication

Providers → Google: enable, paste the same Client ID and Secret.

URL Configuration:

- Site URL: `https://zerosmokeway.life`
- Redirect URLs: `http://localhost:5173/**`, `http://localhost:5174/**`, `https://zerosmokeway.life/**`, `https://www.zerosmokeway.life/**`, `https://zerosmokeway.vercel.app/**`

New accounts see the intro, then scene 1. Returning accounts resume: chat restores dialogue; a film in progress plays again from the poster. After a confirmed last cigarette they land on the support home.

## Deploy

Vercel builds `webapp` (`vercel.json`). Set the same env vars on the project. Scene and support functions use a longer Meta budget (about 100s) under a 120s `maxDuration` — confirm the Vercel plan allows it.

## History

Earlier Flutter and Phaser prototypes remain in Git history; their unused source and tooling are removed from the current tree. Hackathon notes: [docs/hackathon/submission.md](docs/hackathon/submission.md).

Scene design index: [docs/design/act1-scene1.md](docs/design/act1-scene1.md) · [dialogue](docs/design/scene-dialogue.md) · [post-quit](docs/dialogue-and-post-quit-design.md)
