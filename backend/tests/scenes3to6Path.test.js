import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSceneRequest } from '../services/sceneDialogue.js';

const json = (value) => JSON.stringify(value);
const completion = (value) => async () => ({ choices: [{ message: { content: json(value) } }] });

const prior = [
  {
    id: 'm-view',
    theme: 'current_view',
    sceneId: 'pitcher',
    source: 'player',
    depth: 'partial',
    summary: 'work-from-home breaks; cigarette is part of the quiet after a stuck bug',
    quote: 'Outside I can stop trying for five minutes',
    turnRef: 'u3',
    openQuestion: 'what the break is without the cigarette',
  },
  {
    id: 'm-origin',
    theme: 'first_stretch',
    sceneId: 'firstPuff',
    source: 'player',
    depth: 'thorough',
    summary: 'twenty, a party, curiosity; later bought a pack; embarrassing that solo smoking became regular',
    quote: 'I wasn’t a smoker because I didn’t buy my own',
    turnRef: 'u8',
  },
  {
    id: 'm-belong',
    theme: 'belonging',
    sceneId: 'firstPuff',
    source: 'player',
    depth: 'partial',
    summary: 'looked like hanging out, not starting properly; most friends still smoke',
    quote: 'It felt like part of hanging out',
    turnRef: 'u6',
    openQuestion: 'what smoking looked like around them',
  },
];

test('scenes 3–6 inherit shared contract, continue from memory, and do not require film morals', async () => {
  let labyrinthPrompt;
  const labyrinthKickoff = await handleSceneRequest({
    sceneId: 'labyrinth',
    message: 'The film ended. The player just watched it. Speak the first line.',
    history: [],
    memory: prior,
  }, {
    createCompletion: async params => {
      labyrinthPrompt = params.messages[0].content;
      return { choices: [{ message: { content: json({
        reply: 'Earlier you said it felt like hanging out, not starting properly. Did any of these pictures resemble how smoking looked around you?',
        stance: 'probe',
        next: 'stay',
        memory_updates: [],
      }) } }] };
    },
  });
  assert.match(labyrinthPrompt, /hanging out/);
  assert.match(labyrinthPrompt, /Do not repeat the origin interview/);
  assert.match(labyrinthPrompt, /There is no Tracker/);
  assert.match(labyrinthPrompt, /keep it as theirs/);
  assert.doesNotMatch(labyrinthPrompt, /named an ad or film trick/);
  assert.doesNotMatch(labyrinthPrompt, /Did anything in that scene feel familiar/);
  assert.equal(labyrinthKickoff.next, 'stay');

  const labyrinthStay = await handleSceneRequest({
    sceneId: 'labyrinth',
    canAdvance: true,
    offerOpen: false,
    message: 'It’s a bit embarrassing — I still liked looking older with them.',
    history: [{ role: 'user', content: 'Not the cowboy. Just looking older with friends.' }],
    memory: prior,
  }, {
    createCompletion: completion({
      reply: 'I hear that it feels embarrassing to you. Wanting to look older with them can sit next to that. What does “looking older” still mean for you now?',
      stance: 'probe',
      next: 'stay',
      memory_updates: [{
        id: 'm-image',
        theme: 'acquired_image',
        sceneId: 'labyrinth',
        source: 'player',
        depth: 'partial',
        summary: 'friends made smoking look older; still a bit embarrassing',
        quote: 'I still liked looking older with them',
        turnRef: 'u2',
      }],
    }),
  });
  assert.equal(labyrinthStay.next, 'stay');
  assert.match(labyrinthStay.response, /embarrassing/);

  const labyrinthOffer = await handleSceneRequest({
    sceneId: 'labyrinth',
    message: 'Yeah. It meant belonging more than the ads.',
    history: [
      { role: 'assistant', content: 'What does looking older still mean for you now?' },
      { role: 'user', content: 'It’s a bit embarrassing — I still liked looking older with them.' },
    ],
    memory: labyrinthStay.memory,
  }, {
    createCompletion: completion({
      reply: 'Belonging, not the billboard. That’s a real take on how it looked around you. Want to look at what the cigarette actually gives in one of those minutes?',
      stance: 'advance',
      next: 'offer',
      assessment: {
        position: 'friends made it look older; belonging more than ads',
        quotes: ['It meant belonging more than the ads'],
        examined: 'acquired meaning around early use',
        open: 'what the minute itself gives',
        whyNext: 'meaning is named; pleasure/relief is still open',
        depth: 'examined',
      },
    }),
  });
  assert.equal(labyrinthOffer.next, 'offer');
  assert.equal(labyrinthOffer.assessment.depth, 'examined');

  let shoesPrompt;
  const shoesKickoff = await handleSceneRequest({
    sceneId: 'shoes',
    message: 'The film ended. The player just watched it. Speak the first line.',
    history: [],
    memory: [
      ...labyrinthStay.memory,
      {
        id: 'm-miss',
        theme: 'would_miss',
        sceneId: 'pitcher',
        source: 'player',
        depth: 'partial',
        summary: 'hands busy, maybe; never takes the break without one',
        quote: 'Having something to do with my hands, maybe',
        turnRef: 'u4',
      },
    ],
  }, {
    createCompletion: async params => {
      shoesPrompt = params.messages[0].content;
      return { choices: [{ message: { content: json({
        reply: 'You already said the outside break is quiet after a stuck bug, and you are not sure what you would miss besides something in your hands. In that minute, what actually changes when you light it?',
        stance: 'probe',
        next: 'stay',
      }) } }] };
    },
  });
  assert.match(shoesPrompt, /stop trying for five minutes|hands/);
  assert.match(shoesPrompt, /Do not re-ask “what would you miss\?”/);
  assert.doesNotMatch(shoesPrompt, /thirst the smoke made/);
  assert.equal(shoesKickoff.next, 'stay');

  const shoesLike = await handleSceneRequest({
    sceneId: 'shoes',
    message: 'I like it. The shoes thing is over the top. Taste is fine. I just like standing outside.',
    history: [{ role: 'assistant', content: 'In that minute, what actually changes when you light it?' }],
    memory: shoesKickoff.memory ?? prior,
  }, {
    createCompletion: completion({
      reply: 'Standing outside is the bit you like; the tight-shoes picture doesn’t have to fit. If we leave the film aside, is the taste doing anything in that minute, or is it mostly being out there?',
      stance: 'probe',
      next: 'stay',
    }),
  });
  assert.equal(shoesLike.next, 'stay');
  assert.match(shoesLike.response, /Standing outside/);

  let stressPrompt;
  const stressKickoff = await handleSceneRequest({
    sceneId: 'stress',
    message: 'The film ended. The player just watched it. Speak the first line.',
    history: [],
    memory: prior,
  }, {
    createCompletion: async params => {
      stressPrompt = params.messages[0].content;
      return { choices: [{ message: { content: json({
        reply: 'Earlier you said you go outside when you are stuck on a bug. After that cigarette, when you come back to the screen — what is different, if anything?',
        stance: 'probe',
        next: 'stay',
      }) } }] };
    },
  });
  assert.match(stressPrompt, /stuck bug|stop trying for five minutes/);
  assert.match(stressPrompt, /Do not open with “You smoke because of stress\?”/);
  assert.doesNotMatch(stressPrompt, /raises the anxiety/);
  assert.equal(stressKickoff.next, 'stay');

  const stressHelps = await handleSceneRequest({
    sceneId: 'stress',
    message: 'I still feel it helps. Not sure I can split the cigarette from the five minutes.',
    history: [{ role: 'assistant', content: 'After that cigarette, when you come back to the screen — what is different, if anything?' }],
    memory: prior,
  }, {
    createCompletion: completion({
      reply: 'You still feel it helps, and the cigarette and the five minutes are one package for you. That’s enough of a reading for this. Want to look at what happens to the work itself when you come back?',
      stance: 'advance',
      next: 'offer',
      assessment: {
        position: 'still feels it helps; cannot separate cigarette from the break',
        quotes: ['I still feel it helps'],
        examined: 'stuck-bug sequence around the cigarette',
        open: 'what happens to the task after',
        whyNext: 'stress minute is examined; boredom/focus is the open loop',
        depth: 'examined',
      },
    }),
  });
  assert.equal(stressHelps.next, 'offer');
  assert.match(stressHelps.response, /still feel it helps/);

  let boredomPrompt;
  const boredomKickoff = await handleSceneRequest({
    sceneId: 'boredom',
    message: 'The film ended. The player just watched it. Speak the first line.',
    history: [],
    memory: prior,
  }, {
    createCompletion: async params => {
      boredomPrompt = params.messages[0].content;
      return { choices: [{ message: { content: json({
        reply: 'When you come back from that outside break to the same bug — what happens to the work?',
        stance: 'probe',
        next: 'stay',
      }) } }] };
    },
  });
  assert.match(boredomPrompt, /return to a task/);
  assert.match(boredomPrompt, /Do not require “it can’t both excite and relax,”/);
  assert.doesNotMatch(boredomPrompt, /cannot both wake and calm/);
  assert.equal(boredomKickoff.next, 'stay');
});
