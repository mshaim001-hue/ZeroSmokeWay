import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSceneRequest, SCENE_JOBS } from '../services/sceneDialogue.js';

const json = (value) => JSON.stringify(value);

const prior = [
  {
    id: 'm-friends',
    theme: 'belonging',
    sceneId: 'labyrinth',
    source: 'player',
    depth: 'partial',
    summary: 'most friends still smoke; belonging more than ads',
    quote: 'It meant belonging more than the ads',
    turnRef: 'u12',
  },
  {
    id: 'm-break',
    theme: 'pause',
    sceneId: 'shoes',
    source: 'player',
    depth: 'partial',
    summary: 'likes standing outside; cigarette and break still one package',
    quote: 'I just like standing outside',
    turnRef: 'u16',
  },
  {
    id: 'm-try',
    theme: 'attempt',
    sceneId: 'pitcher',
    source: 'player',
    depth: 'partial',
    summary: 'about ten days, then smoked again; wants to stop in a couple of weeks',
    quote: 'I lasted about ten days',
    turnRef: 'u5',
  },
];

async function promptOf(sceneId) {
  let prompt;
  await handleSceneRequest({
    sceneId,
    message: 'The film ended. The player just watched it. Speak the first line.',
    history: [],
    memory: prior,
  }, {
    createCompletion: async params => {
      prompt = params.messages[0].content;
      return { choices: [{ message: { content: json({
        reply: 'What do you make of that?',
        stance: 'hold',
        next: 'stay',
      }) } }] };
    },
  });
  return prompt;
}

test('scenes 7–15 continue from memory, stay distinct, and drop moral gates', async () => {
  for (const id of ['relax', 'combo', 'willpower', 'swamp', 'substitutes', 'monster', 'ritual', 'weeks', 'truth']) {
    assert.match(SCENE_JOBS[id], /MAIN THEME/);
    assert.match(SCENE_JOBS[id], /There is no Tracker|Film metaphors are pictures/);
  }

  const relax = await promptOf('relax');
  assert.match(relax, /belonging more than the ads/);
  assert.match(relax, /NEW here, not scenes 4–6/);
  assert.match(relax, /Do not re-run a solo work-break/);
  assert.doesNotMatch(relax, /named that trap \(waiting to escape/);

  const combo = await promptOf('combo');
  assert.match(combo, /NEW here, not scenes 5–7/);
  assert.match(combo, /standing outside/);
  assert.doesNotMatch(combo, /nicotine parasite that pretends to fix all three/);

  const willpower = await promptOf('willpower');
  assert.match(willpower, /lasted about ten days/);
  assert.match(willpower, /Do not say the method of willpower is doomed/);
  assert.match(willpower, /they smoked again/);
  assert.match(willpower, /do not re-ask “have you tried to quit\?”/);

  const swamp = await promptOf('swamp');
  assert.match(swamp, /Forcing a full stop was the last scene/);
  assert.match(swamp, /do not devalue it/);
  assert.doesNotMatch(swamp, /cutting down is the cruelest torture/);

  const substitutes = await promptOf('substitutes');
  assert.match(substitutes, /Do not analogize to heroin/);
  assert.match(substitutes, /Do not tell them to stop a help method/);
  assert.doesNotMatch(substitutes, /like offering a heroin addict/);

  const monster = await promptOf('monster');
  assert.match(monster, /not a three-week medical timeline/);
  assert.doesNotMatch(monster, /reverse Tamagotchi: do not feed it/);

  const ritual = await promptOf('ritual');
  assert.match(ritual, /Do not repeat a freedom slogan/);
  assert.match(ritual, /They may not be ready/);
  assert.doesNotMatch(ritual, /next=offer only when they themselves named that the cigarette was the prison/);

  const weeks = await promptOf('weeks');
  assert.match(weeks, /ten days/);
  assert.match(weeks, /Do not re-do the last-cigarette gesture/);
  assert.doesNotMatch(weeks, /the craving is the parasite dying, not their true want/);

  const truth = await promptOf('truth');
  assert.match(truth, /Still smoking, unsure, or done/);
  assert.match(truth, /There is no Tracker/);
  assert.doesNotMatch(truth, /they can look at smokers without wanting it/);
});
