import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

let agentReply;
let agentCalls = 0;
let receivedSummary;
mock.module('../services/agentService.js', { namedExports: {
  handleAgentRequest: async () => { agentCalls++; return agentReply; },
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
