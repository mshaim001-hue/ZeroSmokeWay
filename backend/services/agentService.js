import OpenAI from 'openai';
import dotenv from 'dotenv';
import { getAgentPrompt } from './agentConfig.js';
import { analyzeResponseWithSubAgents } from './subAgentService.js';
import { createCompactContext } from './contextManagerService.js';
import {
  formatAuthContextForPrompt,
  formatSecondaryAgentAuthRules,
} from './authContext.js';

dotenv.config();

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error('OPENAI_API_KEY is not configured; AI requests are unavailable');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function handleAgentRequest({
  message,
  agentType,
  conversationHistory,
  anamnesisData,
  userProfile,
  orchestratorInstruction = null,
  authContext = null,
  mythPlan = null,
  pledgeText = null,
}) {
  const auth = authContext ?? {
    isAuthenticated: false,
    userTurnCount: conversationHistory.filter((m) => m.isUser).length,
    assistantTurnCount: conversationHistory.filter((m) => !m.isUser).length,
  };
  const authSystemBlock = `${formatAuthContextForPrompt(auth)}${formatSecondaryAgentAuthRules(agentType, auth)}`;
  const systemPrompt = await getAgentPrompt(agentType);

  if (!systemPrompt) throw new Error(`Unknown agent: ${agentType}`);

  const historyToUse = conversationHistory.length > 20
    ? createCompactContext(conversationHistory, agentType).messages
    : conversationHistory;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: authSystemBlock },
  ];

  if (userProfile) {
    messages.push({ role: 'system', content: `Контекст юзера: ${JSON.stringify(userProfile)}` });
  }

  if (anamnesisData) {
    messages.push({ role: 'system', content: `Данные из этапа 1: ${JSON.stringify(anamnesisData)}` });
  }

  if (agentType === 'support' && mythPlan) {
    messages.push({
      role: 'system',
      content: `Индивидуальный план (контекст): ${JSON.stringify(mythPlan).slice(0, 8000)}`,
    });
    if (pledgeText) {
      messages.push({ role: 'system', content: `Торжественное обещание человека: "${pledgeText}"` });
    }
  }

  historyToUse.forEach((msg) => {
    messages.push({ role: msg.isUser ? 'user' : 'assistant', content: msg.text });
  });

  if (orchestratorInstruction) {
    messages.push({
      role: 'system',
      content: `НА ЭТОТ ОТВЕТ:\n${orchestratorInstruction}`,
    });
  }

  messages.push({ role: 'user', content: message });

  try {
    const model = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
    const completion = await getOpenAI().chat.completions.create({
      model,
      messages,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    let finalResponse = parsed.message;
    let analysisResults = null;

    const useSubAgents = process.env.USE_SUB_AGENTS === 'true';
    if (useSubAgents) {
      const analysis = await analyzeResponseWithSubAgents({
        agentResponse: finalResponse,
        agentType,
        userMessage: message,
        extractedData: parsed.extractedData,
        conversationHistory: historyToUse,
      });

      if (analysis.wasImproved) {
        finalResponse = analysis.improvedResponse;
        analysisResults = analysis.analysis;
      }
    }

    return {
      response: finalResponse,
      extractedData: parsed.extractedData,
      extractedProfile: parsed.extractedProfile,
      currentStep: parsed.currentStep,
      analysis: analysisResults,
      contextCompacted: conversationHistory.length > 20,
    };
  } catch (error) {
    console.error('AI Error:', error);
    throw new Error('Не удалось получить ответ от агента');
  }
}

export function formatMythSectionResponse(section, index, total) {
  const header = section.title ? `**${section.title}**\n\n` : '';
  const footer = index < total - 1 ? '\n\n—\n\n*(продолжение следует)*' : '';
  return header + section.content + footer;
}
