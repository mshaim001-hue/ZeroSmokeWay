// Vercel Serverless Function: оркестратор диалога + восстановление сессии
import { runJourneyRequest } from '../services/journeyPipeline.js';
import { PHASES } from '../services/journeyPhases.js';
import { getUserIdFromAuthHeader, hasSupabaseAdmin } from '../lib/supabaseServer.js';
import { getOrchestratorSession, saveOrchestratorConversation } from '../services/conversationStore.js';
import { parseOrchestratorImportPayload } from '../services/orchestratorSnapshotImport.js';

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

  if (req.method === 'PUT') {
    try {
      const userId = await getUserIdFromAuthHeader(req.headers.authorization);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Без service_role записать нельзя. Честно отдаём ошибку, чтобы клиент сохранил
      // гостевой снимок в localStorage, а не потерял его, посчитав перенос успешным.
      if (!hasSupabaseAdmin()) {
        return res.status(503).json({ error: 'Хранилище недоступно: задайте SUPABASE_SERVICE_ROLE_KEY' });
      }

      const parsed = parseOrchestratorImportPayload(req.body);
      if (!parsed.ok) {
        return res.status(parsed.status).json({ error: parsed.error });
      }

      const existing = await getOrchestratorSession(userId);
      const hasServerChat = Boolean(
        existing && Array.isArray(existing.messages) && existing.messages.length > 0,
      );
      if (hasServerChat) {
        return res.status(409).json({ error: 'Orchestrator session already exists' });
      }

      await saveOrchestratorConversation(userId, parsed.messages, {
        phase: parsed.phase,
        plan: parsed.plan,
        anamnesis: parsed.anamnesis,
      });
      return res.status(204).end();
    } catch (error) {
      console.error('Orchestrator PUT session:', error);
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

    const payload = await runJourneyRequest({
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
