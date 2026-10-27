# ZeroSmokeWay — Two-day social launch

Prepared October 27, 2026. All publication copy is in English.

## Context and publishing plan

- These are new accounts, launched for the Meta Global AI Developer Hackathon 2026.
- Accounts will continue to be updated after the hackathon.
- Publish two stories per day, adapted separately for X, Threads, and Facebook: 12 placements across two days.
- Day 1: hackathon introduction, then personal story and product idea.
- Day 2: stack and public repository, then current progress.
- Pin the first introduction where available.
- LinkedIn URL has not been supplied; do not invent one.
- Progress claims reflect the author's October 27 update; recheck before publishing if implementation changes.
- These are drafts ready for manual posting; nothing has been published or scheduled.

## Day 1 — Post 1: Hackathon introduction

### X

I’m joining the Meta Global AI Developer Hackathon 2026 with ZeroSmokeWay.

I smoke. I want to quit. I’m building an experience to explore why I keep smoking.

This account starts with the hackathon. I’ll keep sharing the work afterward.

### Threads

I’m joining the Meta Global AI Developer Hackathon 2026 with ZeroSmokeWay.

I’m a smoker who wants to quit. For almost a year, I’ve been returning to an app idea that might help me understand what keeps me smoking.

I created this account to share the next chapter: scenes, conversations, AI, and the decisions behind them.

I’ll keep posting after the hackathon, too. This is an unfinished project with a personal reason behind it.

### Facebook

I’m participating in the Meta Global AI Developer Hackathon 2026 with my project, ZeroSmokeWay.

The reason is personal: I smoke, and I want to quit.

I’ve been developing and rethinking this project for almost a year. The hackathon gives me a deadline to build a focused experience: cinematic and interactive scenes, followed by conversations that respond to what the person actually says.

The project existed before the event. I’ll clearly distinguish that earlier work from what I build during the hackathon.

This is the first post on a new account. I’ll share progress, experiments, setbacks, and changes here—and continue after the hackathon ends.

## Day 1 — Post 2: Personal story and product idea

### X

I once quit smoking with Allen Carr’s method. Later: hookah → cigars → cigarillos → cigarettes again.

I haven’t managed to repeat that success.

That’s why I’m building ZeroSmokeWay: scenes and conversations to explore what keeps me smoking.

### Threads

I once quit smoking with Allen Carr’s method.

Then I returned through hookah, cigars, and cigarillos—and found myself smoking cigarettes again.

I’ve smoked for about 15 years, with breaks. I haven’t managed to repeat that earlier success.

That’s the personal reason behind ZeroSmokeWay. I want to explore whether scenes and responsive conversations can help me look at smoking differently again.

I’m still smoking. Whether this can help is something I still need to find out.

### Facebook

ZeroSmokeWay starts with something I haven’t solved in my own life.

I’ve smoked for about fifteen years, with some breaks. Once, Allen Carr’s method helped me quit.

Later I started with hookah, then cigars, then cigarillos. I barely noticed the point when cigarettes became part of my life again.

I haven’t been able to make the same approach work for me again. That experience is why I keep returning to this project.

The application I want to build uses short films and interactive scenes, followed by a conversation about what you saw. Your answers should influence where that conversation goes.

I’m skeptical about other approaches for myself, while recognizing that they may help other people. My own experience is the reason for this experiment—not proof that it will work.

Have you ever quit and later started again?

## Day 2 — Post 3: Stack and public development

### X

Building ZeroSmokeWay with React, TypeScript, Vite, Node.js, and Meta Muse. Developing in Cursor.

Muse helps decide when a conversation should go deeper or move to another scene.

Code and hackathon work:
https://github.com/mshaim001-hue/ZeroSmokeWay

### Threads

The stack behind ZeroSmokeWay:

React + TypeScript + Vite on the frontend. Node.js + Express on the backend. Meta Muse for conversation and routing.

I develop in Cursor.

The interesting part is the transition: should we stay with an answer, ask another question, or open the next scene?

The repository is public, including the distinction between earlier work and hackathon additions:

https://github.com/mshaim001-hue/ZeroSmokeWay

### Facebook

A look at how I’m building ZeroSmokeWay.

The frontend uses React, TypeScript, and Vite. The backend uses Node.js and Express. I’m developing in Cursor and integrating Meta Muse into the scene conversations.

The technical part I care about most is dialogue routing.

After a scene, the model needs to decide whether to explore an answer further, ask a follow-up, let that topic end, or allow the next scene.

Earlier versions explored other formats, including a Phaser labyrinth. The repository keeps that history, and the hackathon work is identified separately.

I’ll share technical decisions here alongside the personal story and visual progress.

Public repository:
https://github.com/mshaim001-hue/ZeroSmokeWay

## Day 2 — Post 4: Current progress

### X

ZeroSmokeWay progress: two scenes connected by a Muse-routed conversation.

The model can hold, probe, release, or advance. The client waits for its decision before opening the next scene.

The flow has been checked locally in a browser. Still an early prototype.

### Threads

Where ZeroSmokeWay stands:

Two scenes: “The Carnivorous Plant Garden” and “The Salt Well.”

Between them, Muse routes the conversation using four decisions: hold, probe, release, or advance.

The client waits for the model to allow the next scene.

The flow has been checked locally in a browser. Next, I want to test how it handles different answers and disagreement.

A working transition is a start. Making that conversation meaningful is the harder part.

### Facebook

The current ZeroSmokeWay prototype connects two scenes:

“The Carnivorous Plant Garden,” featuring a bee and a trap, and “The Salt Well,” featuring a rabbit and a sip of salt.

A conversation follows the first scene. Muse can stay with the topic, ask a follow-up, finish the thread, or allow the next scene.

Those decisions are represented in the code as hold, probe, release, and advance. The client waits for the model’s decision before making the next scene available.

The flow has been checked locally in a browser. That confirms the transition works; it doesn’t yet tell me whether the experience is useful.

My next focus is testing different responses—including disagreement—to see whether the conversation follows the person meaningfully.

## Media

- Post 1: generated editorial cover at [cover.png](2026-10-27-first-article/cover.png). This is an illustration, not a screenshot.
- Post 2: text only.
- Post 3: capture the actual public repository.
- Post 4: record a short clip of the actual scene-to-dialogue flow.
- Longer background article: [article.md](2026-10-27-first-article/article.md).
- Image generation prompt and alt text: [cover-notes.md](2026-10-27-first-article/cover-notes.md).
