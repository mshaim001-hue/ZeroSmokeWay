// Vercel Serverless Function: оркестратор диалога
import { getOrchestratorDecision, PHASES } from '../services/orchestratorService.js';
import { handleAgentRequest } from '../services/agentService.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      message,
      conversationHistory = [],
      anamnesisData = null,
      phase = PHASES.WELCOME,
      userProfile = null,
      currentPlan = null,
    } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const decision = await getOrchestratorDecision({
      message: message.trim(),
      conversationHistory,
      phase,
      anamnesisData,
      userProfile,
      currentPlan,
    });

    const agentResult = await handleAgentRequest({
      message: message.trim(),
      agentType: decision.nextAgent,
      conversationHistory,
      anamnesisData,
      userProfile,
      useAdaptiveMode: decision.nextAgent === 'anamnesis' && process.env.USE_ADAPTIVE_ANAMNESIS === 'true',
      orchestratorInstruction: decision.instructionToAgent,
    });

    res.status(200).json({
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
    });
  } catch (error) {
    console.error('Orchestrator request error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}

export const config = {
  maxDuration: 45,
};
