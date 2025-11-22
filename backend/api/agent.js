// Vercel Serverless Function
import { handleAgentRequest } from '../services/agentService.js';

export default async function handler(req, res) {
  // Set CORS headers
  // Enable CORS
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

    res.status(200).json(result);
  } catch (error) {
    console.error('Agent request error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

