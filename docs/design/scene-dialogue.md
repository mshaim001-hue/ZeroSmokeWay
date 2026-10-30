# Talk after a scene

After the film the player does not get a questionnaire. Meta Muse Spark talks live. No prepared questions and no fake replies: if the model fails, the screen says retry.

## What the talk is for

The film shows a trap. The chat is so the person can put their own life on it.

- Scene 1, the bee: “I only wanted to try / I can stop whenever I want.”
- Scene 2, the first puff: friends offer it at about sixteen; he coughs, they laugh, he keeps smoking so he will not look weak.
- Scene 3, the labyrinth: last-request, sport, and romance ads; they name the trick and put a fact against it.
- Scene 4, tight shoes: the “pleasure” is only stopping a pain the shoes (the cigarette) created.
- Scene 5, Boss Stress: smoking does not soothe the nerves; nicotine hunger feeds the storm.
- Scene 6, Boredom and Concentration: the same cigarette cannot both wake you up and calm you down; it only distracts and starves the brain.
- Scene 7, Boss Relaxation: the party is already relaxed; the smoker waits for the toast to run into the frost, caught between guilt and deprivation.
- Scene 8, Combined Cigarette: stuck in traffic after the dentist; stress, boredom, and the itch to relax hit at once — split road fatigue from the nicotine parasite.
- Scene 9, Rocky Mountain of Willpower: he crawls the cliff as a terrible sacrifice, grows angry, falls — willpower is doomed while deprivation stays in the head.
- Scene 10, Swamp of Cutting Down: five a day; the wait is eternity, each smoke becomes precious, the bog pulls him deeper — cutting down is the cruelest torture.
- Scene 11, Shop of Substitutes: gum, patches, vapes, mints — treating nicotine with nicotine is the same drug in another wrapper.
- Scene 12, Lair of the Little Nicotine Monster: a tiny worm with no claws, only an itch; reverse Tamagotchi — do not feed it and in about three weeks it dies.
- Scene 13, Ritual of the Last Cigarette: last drag in a cell whose door is already open; he kills it on the bars and walks into the light. After the film the head line is I am free.
- Scene 14, First Three Weeks: coffee, phone, the old cue; the monster screams for a smoke — the craving is the parasite dying, not you.
- Scene 15, Moment of Truth: the sky clears; he looks at smokers with pity, not envy. After the film the head line is You are free forever.

No lecture. No list. Stay with their words. Deeper per-scene dialogue graphs come after the films.

## How it works

1. The film ends → chat fills the screen.
2. The server calls Meta Model API (`muse-spark-1.3`, `https://api.meta.ai/v1`) with the hardcoded speech profile and this scene’s job.
3. The first spoken line is from the model. The hidden kickoff is not shown.
4. Then a normal thread. History is only what the person sees.
5. `MODEL_API_KEY` stays on the server.
