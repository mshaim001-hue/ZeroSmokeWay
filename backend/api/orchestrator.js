// Vercel Serverless Function: оркестратор диалога + восстановление сессии
import { runOrchestrationRequest } from '../services/orchestratorPipeline.js';
import { PHASES } from '../services/orchestratorService.js';
import { getUserIdFromAuthHeader } from '../lib/supabaseServer.js';
import { getOrchestratorSession } from '../services/conversationStore.js';

const CORS_HEADERS =
  'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', CORS_HEADERS);
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const auth = req.headers.authorization;
      const userId = await getUserIdFromAuthHeader(auth);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const session = await getOrchestratorSession(userId);
      return res.status(200).json(session ?? { messages: [], orchestrator_state: {} });
    } catch (error) {
      console.error('Orchestrator GET session:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, conversationHistory = [], phase = PHASES.WELCOME } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const payload = await runOrchestrationRequest({
      body: req.body,
      authorizationHeader: req.headers.authorization,
    });

    return res.status(200).json(payload);
  } catch (error) {
    console.error('Orchestrator request error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}

export const config = {
  maxDuration: 45,
};
