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

test('first play roll creates the session and calls the master', async () => {
  const before = masterCalls;
  const landed = await runJourneyRequest({ body: { message: '🎲 4' } });
  assert.equal(masterCalls, before + 1);
  assert.equal(landed.phase, 'anamnesis');
  assert.equal(landed.lilaState.position, 4);
  assert.equal(landed.diceReady, false);
  assert.match(landed.anamnesisState.lilaBoardStatus, /Не отпускаю/);
  assert.doesNotMatch(landed.response, /Брось кубик/);
});

test('handoff CTA starts stage 2 only after the game is finished', async () => {
  const started = await runJourneyRequest({ body: { message: '🎲 2' } });
  const blocked = await runJourneyRequest({
    body: { message: 'Перейти к разбору', phase: 'anamnesis', anamnesisData: started.anamnesisState },
  });
  assert.equal(blocked.phase, 'anamnesis');

  const handoff = {
    userFinalExplanation: 'Курю, чтобы разрешить паузу после задачи.',
    startNextStage: false,
    transition: { message: 'действительно ли сигарета даёт тебе то, что ты ей приписываешь?', cta: 'Перейти к разбору' },
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
  assert.match(next.response, /действительно ли сигарета даёт/);
  assert.match(next.response, /Разбор/);
});
