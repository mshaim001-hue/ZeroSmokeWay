import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSceneRequest } from '../services/sceneDialogue.js';

const json = (value) => JSON.stringify(value);
const completion = (value) => async () => ({ choices: [{ message: { content: json(value) } }] });

test('scripted path: scene 1 offer, new thought stays, scene 2 continues from memory', async () => {
  const opener = { role: 'assistant', id: 'a0', content: 'What did you make of that?' };

  const identified = await handleSceneRequest({
    sceneId: 'pitcher',
    message: 'That’s about me. I also thought I’d stop easily.',
    history: [opener],
  }, {
    createCompletion: completion({
      reply: 'You thought stopping would be easy. When did that stop feeling true?',
      stance: 'probe',
      next: 'stay',
      memory: [{
        id: 'm-view',
        theme: 'current_view',
        source: 'player',
        depth: 'partial',
        summary: 'thought stopping would be easy',
        quote: 'I also thought I’d stop easily',
        turnRef: 'u1',
        openQuestion: 'when that view changed',
      }],
    }),
  });
  assert.equal(identified.next, 'stay');
  assert.equal(identified.memory[0].source, 'player');

  const offered = await handleSceneRequest({
    sceneId: 'pitcher',
    message: 'The next month thing. I’m tired of promising it.',
    history: [opener, { role: 'user', id: 'u1', content: 'That’s about me.' }],
    memory: identified.memory,
  }, {
    createCompletion: completion({
      reply: 'You describe it as something that quietly became part of the day. I’d like to go back to the beginning — how it was for you. Want to look?',
      stance: 'advance',
      next: 'offer',
      memory: [
        ...identified.memory,
        {
          id: 'm-why',
          theme: 'why_here',
          source: 'player',
          depth: 'partial',
          summary: 'tired of promising next month',
          quote: 'I’m tired of promising it',
          turnRef: 'u2',
        },
      ],
      assessment: {
        position: 'slid into the day; tired of promising',
        quotes: ['I’m tired of promising it'],
        examined: 'how they see smoking now',
        open: 'the beginning',
        whyNext: 'they described a slide from friends to part of the day',
        depth: 'examined',
      },
    }),
  });
  assert.equal(offered.next, 'offer');
  assert.equal(offered.assessment.depth, 'examined');

  const waited = await handleSceneRequest({
    sceneId: 'pitcher',
    message: 'Wait — also, I don’t hate it. I just hate the promising.',
    history: [opener, { role: 'user', id: 'u2', content: 'The next month thing.' }],
    memory: offered.memory,
    canAdvance: true,
  }, {
    createCompletion: completion({
      reply: 'What bothers you most about those promises?',
      stance: 'probe',
      next: 'stay',
      memory: offered.memory,
    }),
  });
  assert.equal(waited.next, 'stay');
  assert.match(waited.response, /promises/i);

  let scene2Prompt;
  const continued = await handleSceneRequest({
    sceneId: 'firstPuff',
    message: 'The film ended. The player just watched it. Speak the first line.',
    history: [],
    memory: [
      ...offered.memory,
      {
        id: 'm-stress',
        theme: 'stress',
        sceneId: 'stress',
        source: 'player',
        depth: 'partial',
        summary: 'especially after talking to the boss',
        quote: 'After I talk to my boss I want one',
        turnRef: 'u3',
        openQuestion: 'what the cigarette does in that minute',
      },
    ],
  }, {
    createCompletion: async params => {
      scene2Prompt = params.messages[0].content;
      return { choices: [{ message: { content: json({
        reply: 'Earlier you said you especially want one after talking to your boss. Was there something in this film like that?',
        stance: 'probe',
        next: 'stay',
        memory: params.messages[0].content.includes('boss') ? offered.memory : [],
      }) } }] };
    },
  });
  assert.match(scene2Prompt, /after talking to the boss/);
  assert.match(scene2Prompt, /Start from living memory/);
  assert.doesNotMatch(scene2Prompt, /They are that bee/);
  assert.match(continued.response, /boss/);
  assert.equal(continued.next, 'stay');
});
