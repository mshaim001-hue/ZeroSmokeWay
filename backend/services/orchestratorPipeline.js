import { getOrchestratorDecision, PHASES } from './orchestratorService.js';
import { handleAgentRequest } from './agentService.js';
import { resolveAuthContext } from './authContext.js';
import { saveOrchestratorConversation } from './conversationStore.js';

function mergeAnamnesis(base, extracted) {
  const b = base && typeof base === 'object' ? base : {};
  const e = extracted && typeof extracted === 'object' ? extracted : {};
  return { ...b, ...e };
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

  const agentResult = await handleAgentRequest({
    message: message.trim(),
    agentType: decision.nextAgent,
    conversationHistory,
    anamnesisData,
    userProfile,
    useAdaptiveMode: decision.nextAgent === 'anamnesis' && process.env.USE_ADAPTIVE_ANAMNESIS === 'true',
    orchestratorInstruction: decision.instructionToAgent,
    authContext,
  });

  console.log(
    'Orchestrator →',
    decision.nextAgent,
    '| instruction:',
    (decision.instructionToAgent || '').slice(0, 120),
    authContext.isAuthenticated ? '| JWT user' : '| guest',
  );

  const mergedAnamnesis = mergeAnamnesis(anamnesisData, agentResult.extractedData);
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
      phase: decision.phaseUpdate,
      plan: decision.plan,
      anamnesis: mergedAnamnesis,
    });
  }

  return {
    response: agentResult.response,
    extractedData: agentResult.extractedData,
    extractedProfile: agentResult.extractedProfile,
    currentStep: agentResult.currentStep,
    phase: decision.phaseUpdate,
    nextAgent: decision.nextAgent,
    plan: decision.plan,
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
