import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

let masterCalls = 0;
let masterImpl = async ({ session }) => ({
  session,
  message: 'Наблюдение',
  diceReady: false,
  handoff: null,
});
mock.module('../services/whyISmokeGame/master/run.js', { namedExports: {
  runGameMasterTurn: async (args) => {
    masterCalls += 1;
    return masterImpl(args);
  },
} });
mock.module('../services/agentService.js', { namedExports: {
  handleAgentRequest: async () => ({ response: 'support' }),
  formatMythSectionResponse: (section) => section.content,
} });
mock.module('../services/authContext.js', { namedExports: {
  resolveAuthContext: async () => ({ userId: null, isAuthenticated: false }),
} });
mock.module('../services/conversationStore.js', { namedExports: {
  saveOrchestratorConversation: async () => {},
  getOrchestratorSession: async () => null,
} });
mock.module('../services/emailSequenceService.js', { namedExports: {
  scheduleEmailSequence: async () => {},
} });
mock.module('../lib/supabaseServer.js', { namedExports: {
  getSupabaseAdmin: () => null,
  hasSupabaseAdmin: () => false,
  getUserIdFromAuthHeader: async () => null,
} });
let receivedSummary;
let receivedHandoff;
mock.module('../services/mythPlanService.js', { namedExports: {
  generateMythPlan: async ({ journeySummary, stage2Handoff }) => {
    receivedSummary = journeySummary;
    receivedHandoff = stage2Handoff;
    return { sections: [{ content: 'Разбор' }], pledgePrompt: 'Обещание' };
  },
  normalizeMythPlan: (value) => value ?? null,
  normalizeMythProgress: (value = {}) => ({ sectionIndex: 0, ...value }),
  looksLikePledge: () => false,
} });
const { runJourneyRequest } = await import('../services/journeyPipeline.js');

test('start and failed entry rolls do not call the game master', async () => {
  const before = masterCalls;
  const started = await runJourneyRequest({ body: { message: 'Начать игру' } });
  assert.equal(started.diceReady, true);
  assert.equal(started.phase, 'anamnesis');
  assert.match(started.response, /шестёрк/);
  assert.equal(started.anamnesisState.whyISmokeGame.entered, false);

  const failed = await runJourneyRequest({
    body: { message: '🎲 4', phase: 'anamnesis', anamnesisData: started.anamnesisState },
  });
  assert.equal(masterCalls, before);
  assert.equal(failed.diceReady, true);
  assert.match(failed.anamnesisState.lilaBoardStatus, /Выпало 4 — нужна 6/);
});

test('a successful entry calls the game master and stays in stage 1', async () => {
  const started = await runJourneyRequest({ body: { message: 'Начать игру' } });
  const before = masterCalls;
  const entered = await runJourneyRequest({
    body: { message: '🎲 6', phase: 'anamnesis', anamnesisData: started.anamnesisState },
  });
  assert.equal(masterCalls, before + 1);
  assert.equal(entered.phase, 'anamnesis');
  assert.equal(entered.lilaState.position, 1);
  assert.equal(entered.lilaState.gameEntered, true);
  assert.equal(entered.diceReady, false);
  assert.match(entered.response, /Наблюдение/);
  assert.match(entered.anamnesisState.lilaBoardStatus, /Рождение/);
});

test('handoff CTA starts stage 2 only after the game is finished', async () => {
  const started = await runJourneyRequest({ body: { message: 'Начать игру' } });
  const blocked = await runJourneyRequest({
    body: { message: 'Перейти к разбору', phase: 'anamnesis', anamnesisData: started.anamnesisState },
  });
  assert.equal(blocked.phase, 'anamnesis');

  const handoff = {
    userFinalExplanation: 'Курю, чтобы разрешить паузу после задачи.',
    startNextStage: false,
    transition: { message: 'действительно ли она всё это даёт?', cta: 'Перейти к разбору' },
  };
  const finished = {
    ...started.anamnesisState,
    whyISmokeGame: {
      ...started.anamnesisState.whyISmokeGame,
      status: 'completed',
      finalAnswer: handoff.userFinalExplanation,
      handoff,
    },
    stage2Handoff: handoff,
    lilaJourneySummary: handoff.userFinalExplanation,
  };

  const before = masterCalls;
  const next = await runJourneyRequest({
    body: { message: 'Перейти к разбору', phase: 'anamnesis', anamnesisData: finished },
  });
  assert.equal(masterCalls, before);
  assert.equal(next.phase, 'myth_busting');
  assert.equal(receivedSummary, handoff.userFinalExplanation);
  assert.equal(receivedHandoff.userFinalExplanation, handoff.userFinalExplanation);
  assert.match(next.response, /действительно ли она всё это даёт/);
  assert.match(next.response, /Разбор/);
});
