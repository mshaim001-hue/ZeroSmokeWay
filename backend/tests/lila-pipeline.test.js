import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

let agentReply;
let agentCalls = 0;
let receivedSummary;
let receivedInstruction;
mock.module('../services/agentService.js', { namedExports: {
  handleAgentRequest: async (request) => { agentCalls++; receivedInstruction = request.lilaContext; return agentReply; },
  formatMythSectionResponse: (section) => section.content,
} });
mock.module('../services/authContext.js', { namedExports: {
  resolveAuthContext: async () => ({ userId: null, isAuthenticated: false }),
} });
mock.module('../services/mythPlanService.js', { namedExports: {
  generateMythPlan: async ({ journeySummary }) => {
    receivedSummary = journeySummary;
    return { sections: [{ content: 'Разбор' }], pledgePrompt: 'Обещание' };
  },
  normalizeMythPlan: (value) => value ?? null,
  normalizeMythProgress: (value = {}) => ({ sectionIndex: 0, ...value }),
  looksLikePledge: () => false,
} });
const { runJourneyRequest } = await import('../services/journeyPipeline.js');

test('start and failed entry rolls do not call the narrator; last move survives reflection', async () => {
  const before = agentCalls;
  const started = await runJourneyRequest({ body: { message: 'Начать игру' } });
  assert.equal(started.diceReady, true);
  const failed = await runJourneyRequest({ body: { message: '🎲 4', anamnesisData: started.anamnesisState } });
  assert.equal(agentCalls, before);
  assert.equal(failed.diceReady, true);
  assert.match(failed.anamnesisState.lilaBoardStatus, /Выпало 4 — нужна 6/);
  agentReply = { response: 'Наблюдение', diceReady: false, lilaResearch: { openThreads: ['Мысль о контроле'] } };
  const moved = await runJourneyRequest({ body: { message: '🎲 3', lilaState: { position: 7, gameEntered: true } } });
  assert.equal(moved.lilaState.position, 23);
  assert.deepEqual(moved.lilaState.lastMove, { from: 7, roll: 3 });
  await runJourneyRequest({ body: { message: 'Почему 23?', anamnesisData: moved.anamnesisState } });
  assert.match(receivedInstruction, /10 «Отчаяние» → стрела → 23/);
});

test('full pipeline keeps reflection in the game and transitions only on the summary button', async () => {
  const base = {
    phase: 'anamnesis',
    lilaState: { position: 12, gameEntered: true, visitedCells: [1, 12] },
    conversationHistory: [],
  };
  agentReply = { response: 'Расскажи об этом', diceReady: false, journeySummary: null };
  let result = await runJourneyRequest({ body: { ...base, message: 'Я не курил год' } });
  assert.equal(result.phase, 'anamnesis');
  assert.equal(result.diceReady, false);

  agentReply = { response: 'Вот итог. Можно поправить или перейти.', diceReady: true, journeySummary: 'Сигарета — пауза после задачи.' };
  result = await runJourneyRequest({ body: { ...base, message: 'Теперь понятно' } });
  assert.equal(result.phase, 'anamnesis');
  const proposed = result.anamnesisState;

  agentReply = { response: 'Тогда поправим', diceReady: false, journeySummary: null };
  result = await runJourneyRequest({ body: { ...base, message: 'Нет, это не про меня', anamnesisData: proposed } });
  assert.equal(result.anamnesisState.lilaJourneySummary, null);
  assert.equal(result.phase, 'anamnesis');

  const before = agentCalls;
  result = await runJourneyRequest({ body: { ...base, message: 'Перейти к разбору мифов', anamnesisData: proposed } });
  assert.equal(agentCalls, before, 'acceptance must not request another game narration');
  assert.equal(result.phase, 'myth_busting');
  assert.equal(receivedSummary, proposed.lilaJourneySummary);
  assert.match(result.response, /Разбор/);
});
