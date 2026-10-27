# I’m Building an App to Quit Smoking. I Still Smoke.

*The personal story behind ZeroSmokeWay, and why I’ve spent almost a year coming back to it.*

I smoke. I want to quit. And for almost a year, I’ve kept returning to the idea of building something that might help me do it.

That project is called ZeroSmokeWay.

It has changed shape several times. It started as an idea for an AI agent. Later came a board game, then a labyrinth. Now I’m building an experience made of cinematic and interactive scenes, followed by conversations about what you’ve just seen.

The formats keep changing. The reason I’m making it is personal.

## I quit once. Then I came back.

I’ve been smoking for about fifteen years, with some breaks along the way.

One of those breaks happened with the help of Allen Carr’s method. It helped me quit, which is why the idea of changing how I think about smoking means something to me. I have experienced it myself.

Then I started again. First hookah, then cigars, then cigarillos. Somewhere along that path, I found myself smoking cigarettes again.

Looking back, I think it was a foolish way to return to something I had already managed to leave. But knowing that doesn’t undo it. And now I haven’t been able to make the same approach work for me again.

That’s where this project begins: with the gap between having quit before and still struggling to do it now.

## The idea existed before this hackathon

In an early conversation with ChatGPT, I wrote that I wanted to build an AI agent to help people quit using the ideas behind Carr’s method. Then I asked to break the approach into stages.

The repository’s first commit dates to November 2025. Its earliest README described an application with AI conversations to explore someone’s smoking history and beliefs, followed by support.

Over the following months, I kept working on the conversation: how it should remember people’s answers, what it should ask, and how it could help someone arrive at their own conclusions.

By July, the project had taken the form of a board game inspired by Leela. By September, it was becoming a game about understanding why you smoke. In October, it became a labyrinth: rooms about pleasure, stress, routine, and other things people associate with cigarettes, with interactions and space to write your own thoughts.

Now I’m changing the format again.

I don’t want to present that history as a perfectly planned journey. I’ve kept returning to the project and reconsidering how it should work. You can see those changes in the commits.

## What I’m building now

The current direction is a sequence of scenes. Some are short films. Others involve a game mechanic. After a scene, you talk about what you saw and what, if anything, it means to you.

The first scene is called “The Carnivorous Plant Garden.” A bee approaches nectar and ends up trapped. The conversation afterward gives the player room to respond to that image.

The part I’m working on most carefully is how that conversation moves.

Meta’s Muse model can choose to stay with a topic, ask a follow-up, let a thread end, or allow the next scene. In the implementation, those decisions are represented as `hold`, `probe`, `release`, and `advance`.

The intention is for what you say to affect the experience. If an image means something different to you, or you disagree with it entirely, that response should matter to what happens next.

For the Meta Global AI Developer Hackathon, I’m building this new layer on top of an existing project. The earlier labyrinth is prior work. The cinematic scenes and Muse routing belong to the new hackathon work.

## Why I think it might help

My reason for believing this is worth trying comes from having quit before with Carr’s method. That experience makes me interested in an approach that helps me examine what I believe cigarettes do for me.

I’m skeptical about other ways of quitting for myself, while accepting that they may help other people. I don’t have grounds to turn that personal skepticism into a claim that those approaches don’t work.

And my experience with Carr doesn’t prove this application will work either. That is still an open question.

What I want to explore is whether a scene, an interaction, and a conversation that responds to the person can help create a fresh understanding of something that has become painfully familiar.

I’m still smoking. The application is still changing. I haven’t reached the ending I want to write about yet.

Over the hackathon, I’ll share what I build, what changes, and what I learn from trying it.

If you’ve ever quit and later started again, I’d be interested to hear what returning to smoking was like for you.

[Follow the project on GitHub](https://github.com/mshaim001-hue/ZeroSmokeWay/tree/hackathon-2026)
