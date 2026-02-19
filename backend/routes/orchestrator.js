import express from 'express';
import { getOrchestratorDecision, PHASES } from '../services/orchestratorService.js';
import { handleAgentRequest } from '../services/agentService.js';

const router = express.Router();

/**
 * POST /api/orchestrator
 * Body: { message, conversationHistory?, anamnesisData?, phase?, userProfile? }
 * Оркестратор выбирает агента и инструкцию, вызывает агента, возвращает ответ + обновлённую фазу.
 */
router.post('/', async (req, res) => {
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

    // ——— Лог в терминал: как работает оркестратор ———
    console.log('\n========== ORCHESTRATOR ==========');
    console.log('План на 3 шага вперёд:');
    (decision.plan?.steps || []).forEach((s, i) => {
      console.log(`  ${i + 1}. [${s.agent}] ${s.focus}`);
    });
    console.log('Диалог по плану:', decision.onTrack ? 'да' : 'нет');
    if (decision.planUpdated) {
      console.log('План обновлён: да', decision.reasonOffTrack ? `— ${decision.reasonOffTrack}` : '');
    }
    if (decision.reasonOffTrack && !decision.planUpdated) {
      console.log('Причина сбоя:', decision.reasonOffTrack);
    }
    console.log('Решение на этот ход:', decision.nextAgent, '| инструкция:', decision.instructionToAgent);
    console.log('====================================\n');

    const agentResult = await handleAgentRequest({
      message: message.trim(),
      agentType: decision.nextAgent,
      conversationHistory,
      anamnesisData,
      userProfile,
      useAdaptiveMode: decision.nextAgent === 'anamnesis' && process.env.USE_ADAPTIVE_ANAMNESIS === 'true',
      orchestratorInstruction: decision.instructionToAgent,
    });

    res.json({
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
});

export { router as orchestratorRouter };
