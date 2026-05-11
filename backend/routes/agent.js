import express from 'express';
import { handleAgentRequest } from '../services/agentService.js';
import { getUserIdFromAuthHeader } from '../lib/supabaseServer.js';
import { saveAgentConversation } from '../services/conversationStore.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { message, agentType, conversationHistory, anamnesisData, userProfile } = req.body;

    console.log('\n=== Incoming API Request ===');
    console.log('Agent Type:', agentType);
    console.log('User Message:', message);
    console.log('Conversation History Length:', conversationHistory?.length || 0);
    console.log('Has Anamnesis Data:', !!anamnesisData);
    console.log('Has User Profile:', !!userProfile);
    console.log('============================\n');

    if (!message || !agentType) {
      return res.status(400).json({ error: 'Message and agentType are required' });
    }

    const result = await handleAgentRequest({
      message,
      agentType,
      conversationHistory: conversationHistory || [],
      anamnesisData: anamnesisData || null,
      userProfile: userProfile || null,
    });

    const userId = await getUserIdFromAuthHeader(req.headers.authorization);
    if (userId) {
      const hist = conversationHistory || [];
      await saveAgentConversation(userId, agentType, [
        ...hist,
        { text: result.response, isUser: false, timestamp: new Date().toISOString() },
      ]);
    }

    console.log('\n=== API Response ===');
    console.log('Response length:', result.response?.length || 0);
    console.log('Has extracted data:', !!result.extractedData);
    console.log('====================\n');

    res.json(result);
  } catch (error) {
    console.error('\n=== Agent Request Error ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('===========================\n');
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export { router as agentRouter };

