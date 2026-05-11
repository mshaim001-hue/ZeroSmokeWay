// Vercel Serverless Function
import { handleAgentRequest } from '../services/agentService.js';
import { getUserIdFromAuthHeader } from '../lib/supabaseServer.js';
import { saveAgentConversation } from '../services/conversationStore.js';

const CORS_HEADERS =
  'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', CORS_HEADERS);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, agentType, conversationHistory, anamnesisData } = req.body;

    if (!message || !agentType) {
      return res.status(400).json({ error: 'Message and agentType are required' });
    }

    const result = await handleAgentRequest({
      message,
      agentType,
      conversationHistory: conversationHistory || [],
      anamnesisData: anamnesisData || null,
    });

    const userId = await getUserIdFromAuthHeader(req.headers.authorization);
    if (userId) {
      const hist = conversationHistory || [];
      const finalMessages = [
        ...hist,
        {
          text: result.response,
          isUser: false,
          timestamp: new Date().toISOString(),
        },
      ];
      await saveAgentConversation(userId, agentType, finalMessages);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Agent request error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/** Лимит времени функции (Vercel); не через vercel.json `functions` — конфликтует с `builds`. */
export const config = {
  maxDuration: 30,
};
