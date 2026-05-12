import express from 'express';
import { PHASES } from '../services/orchestratorService.js';
import { runOrchestrationRequest } from '../services/orchestratorPipeline.js';
import { getUserIdFromAuthHeader } from '../lib/supabaseServer.js';
import { getOrchestratorSession } from '../services/conversationStore.js';

const router = express.Router();

/**
 * GET /api/orchestrator  (тот же путь, что POST — для Vercel serverless)
 */
router.get('/', async (req, res) => {
  try {
    const userId = await getUserIdFromAuthHeader(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const session = await getOrchestratorSession(userId);
    return res.json(session ?? { messages: [], orchestrator_state: {} });
  } catch (error) {
    console.error('Orchestrator session GET:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/orchestrator
 */
router.post('/', async (req, res) => {
  try {
    const { message, conversationHistory = [], phase = PHASES.WELCOME } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const decisionAndLog = await runOrchestrationRequest({
      body: req.body,
      authorizationHeader: req.headers.authorization,
    });

    // ——— Лог в терминал: как работает оркестратор ———
    console.log('\n========== ORCHESTRATOR ==========');
    if (decisionAndLog.plan?.steps) {
      console.log('План на 3 шага вперёд:');
      decisionAndLog.plan.steps.forEach((s, i) => {
        console.log(`  ${i + 1}. [${s.agent}] ${s.focus}`);
      });
    }
    console.log('Диалог по плану:', decisionAndLog.onTrack ? 'да' : 'нет');
    if (decisionAndLog.planUpdated) {
      console.log('План обновлён: да');
    }
    console.log('Авторизован (JWT):', decisionAndLog.session?.isAuthenticated ? 'да' : 'нет');
    console.log('====================================\n');

    res.json(decisionAndLog);
  } catch (error) {
    console.error('Orchestrator request error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
});

export { router as orchestratorRouter };
