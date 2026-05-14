import { getOrchestratorDecision, PHASES } from './orchestratorService.js';
import { handleAgentRequest } from './agentService.js';
import { resolveAuthContext } from './authContext.js';
import { saveOrchestratorConversation } from './conversationStore.js';
import { finalizeAnamnesisCoverage, mergeAnamnesisWithCoverage } from './anamnesisCoverage.js';

function isEarlyPhase(ph) {
  return ph === PHASES.WELCOME || ph === PHASES.ANAMNESIS;
}

/**
 * Общая логика POST /api/orchestrator (Express и Vercel).
 */
export async function runOrchestrationRequest({ body, authorizationHeader }) {
  const {
    message,
    conversationHistory = [],
    anamnesisData = null,
    phase = PHASES.WELCOME,
    userProfile = null,
    currentPlan = null,
  } = body;

  const authContext = await resolveAuthContext(authorizationHeader, conversationHistory);

  const decision = await getOrchestratorDecision({
    message: message.trim(),
    conversationHistory,
    phase,
    anamnesisData,
    userProfile,
    currentPlan,
    authContext,
  });

  let nextAgent = decision.nextAgent;
  let phaseUpdate = decision.phaseUpdate;

  const priorSnapshot = finalizeAnamnesisCoverage(anamnesisData);

  if (phase === PHASES.MYTH_BUSTING) {
    nextAgent = 'myth_buster';
    phaseUpdate = PHASES.MYTH_BUSTING;
  } else if (isEarlyPhase(phase) && priorSnapshot.coverageReadyForMythBusting) {
    nextAgent = 'myth_buster';
    phaseUpdate = PHASES.MYTH_BUSTING;
  }

  const agentResult = await handleAgentRequest({
    message: message.trim(),
    agentType: nextAgent,
    conversationHistory,
    anamnesisData,
    userProfile,
    useAdaptiveMode: nextAgent === 'anamnesis' && process.env.USE_ADAPTIVE_ANAMNESIS === 'true',
    orchestratorInstruction: decision.instructionToAgent,
    authContext,
  });

  console.log(
    'Orchestrator →',
    nextAgent,
    '| instruction:',
    (decision.instructionToAgent || '').slice(0, 120),
    authContext.isAuthenticated ? '| JWT user' : '| guest',
  );

  let mergedAnamnesis = mergeAnamnesisWithCoverage(anamnesisData, agentResult.extractedData);
  mergedAnamnesis = finalizeAnamnesisCoverage(mergedAnamnesis);

  let effectivePhase = phaseUpdate;
  if (isEarlyPhase(phaseUpdate) && mergedAnamnesis.coverageReadyForMythBusting) {
    effectivePhase = PHASES.MYTH_BUSTING;
  }

  const userId = authContext.userId;

  if (userId) {
    const finalMessages = [
      ...conversationHistory,
      {
        text: agentResult.response,
        isUser: false,
        timestamp: new Date().toISOString(),
      },
    ];
    await saveOrchestratorConversation(userId, finalMessages, {
      phase: effectivePhase,
      plan: decision.plan,
      anamnesis: mergedAnamnesis,
    });
  }

  return {
    response: agentResult.response,
    extractedData: agentResult.extractedData,
    extractedProfile: agentResult.extractedProfile,
    currentStep: agentResult.currentStep,
    phase: effectivePhase,
    nextAgent,
    plan: decision.plan,
    anamnesisState: mergedAnamnesis,
    coverageScore: mergedAnamnesis.coverageScore,
    onTrack: decision.onTrack,
    planUpdated: decision.planUpdated,
    isComplete: agentResult.isComplete,
    contextCompacted: agentResult.contextCompacted,
    contextStats: agentResult.contextStats,
    /** Серверный флаг по JWT (не полагайтесь на клиент) */
    session: {
      isAuthenticated: authContext.isAuthenticated,
    },
  };
}
