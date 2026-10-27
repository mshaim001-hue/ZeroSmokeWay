# Talk after a scene

After the film the player does not get a questionnaire. Meta Muse Spark talks live. No prepared questions and no fake replies: if the model fails, the screen says retry.

## What the talk is for

The film shows a trap. The chat is so the person can put their own life on it.

- Scene 1, the bee: “I only wanted to try / I can stop whenever I want.”
- Scene 2, the first puff: he coughs, they laugh, he keeps smoking so he will not look like the fool.
- Scene 3, the labyrinth: last-request, sport, and romance ads; they name the trick and put a fact against it.
- Scene 4, tight shoes: the “pleasure” is only stopping a pain the shoes (the cigarette) created.

No lecture. No list. Stay with their words. Deeper per-scene dialogue graphs come after the films.

## How it works

1. The film ends → chat fills the screen.
2. The server calls Meta Model API (`muse-spark-1.3`, `https://api.meta.ai/v1`) with the hardcoded speech profile and this scene’s job.
3. The first spoken line is from the model. The hidden kickoff is not shown.
4. Then a normal thread. History is only what the person sees.
5. `MODEL_API_KEY` stays on the server.
