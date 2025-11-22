import express from 'express';
import { handleAgentRequest } from '../services/agentService.js';

const router = express.Router();

router.post('/', async (req, res) => {
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

    res.json(result);
  } catch (error) {
    console.error('Agent request error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export { router as agentRouter };

