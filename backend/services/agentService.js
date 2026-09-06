import OpenAI from 'openai';
import dotenv from 'dotenv';
import { getAgentPrompt } from './agentConfig.js';
import { handleAdaptiveAnamnesis, isAnamnesisComplete } from './adaptiveAnamnesisService.js';
import { analyzeResponseWithSubAgents } from './subAgentService.js';
import { createCompactContext } from './contextManagerService.js';
import { finalizeAnamnesisCoverage } from './anamnesisCoverage.js';
import { prepareLilaDialogContext } from './lilaDialogMemory.js';
import { extractLilaCoverage } from './lilaExtraction.js';
import {
  formatAuthContextForPrompt,
  formatAnamnesisAuthRules,
  formatSecondaryAgentAuthRules,
} from './authContext.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function handleAgentRequest({
  message,
  agentType,
  conversationHistory,
  anamnesisData,
  userProfile,
  useAdaptiveMode = false,
  orchestratorInstruction = null,
  authContext = null,
  phase = null,
  lilaContext = null,
  mythPlan = null,
  pledgeText = null,
}) {
  const auth = authContext ?? {
    isAuthenticated: false,
    userTurnCount: conversationHistory.filter((m) => m.isUser).length,
    assistantTurnCount: conversationHistory.filter((m) => !m.isUser).length,
  };
  const authSystemBlock = `${formatAuthContextForPrompt(auth)}${agentType === 'anamnesis' ? formatAnamnesisAuthRules(auth) : formatSecondaryAgentAuthRules(agentType, auth)}`;

  if (agentType === 'anamnesis' && useAdaptiveMode) {
    const previousCoverage = anamnesisData?.coverage || null;
    const previousExtractedData = anamnesisData?.extractedData || anamnesisData || null;

    const result = await handleAdaptiveAnamnesis({
      message,
      conversationHistory,
      previousExtractedData,
      previousCoverage,
      authSystemBlock,
    });

    const complete = isAnamnesisComplete(result.coverage);

    return {
      ...result,
      isComplete: complete,
      extractedData: result.extractedData || previousExtractedData,
    };
  }

  const promptKey = agentType;
  const systemPrompt = await getAgentPrompt(promptKey);

  if (!systemPrompt) throw new Error(`Unknown agent: ${agentType}`);

  const isLila = agentType === 'anamnesis';
  let historyToUse = conversationHistory;
  let lilaDialogMemory = null;

  if (isLila) {
    const lilaDialogPrep = await prepareLilaDialogContext({
      conversationHistory,
      anamnesisData,
      visitedCells: anamnesisData?.lilaState?.visitedCells,
    });
    historyToUse = lilaDialogPrep.recentMessages;
    lilaDialogMemory = lilaDialogPrep.lilaDialogMemory;
  } else if (conversationHistory.length > 20) {
    historyToUse = createCompactContext(conversationHistory, agentType).messages;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: authSystemBlock },
  ];

  if (userProfile) {
    messages.push({ role: 'system', content: `Контекст юзера: ${JSON.stringify(userProfile)}` });
  }

  if (isLila) {
    messages.push({
      role: 'system',
      content:
        `Состояние игры: ${JSON.stringify(anamnesisData?.lilaState ?? {})}\n` +
        `Предыдущий предложенный итог (его можно поправить): ${anamnesisData?.lilaJourneySummary || 'пока нет'}`,
    });
    if (lilaDialogMemory?.lilaDialogSummary) {
      messages.push({
        role: 'system',
        content: `=== РЕЗЮМЕ РАННЕГО ДИАЛОГА ===\n${lilaDialogMemory.lilaDialogSummary}`,
      });
    }
    if (lilaContext) {
      messages.push({ role: 'system', content: lilaContext });
    }
  } else if (anamnesisData) {
    messages.push({ role: 'system', content: `Данные из Лилы: ${JSON.stringify(anamnesisData)}` });
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
    const [completion, extractedCoverage] = await Promise.all([
      openai.chat.completions.create({
        model,
        messages,
        response_format: { type: 'json_object' },
      }),
      isLila ? extractLilaCoverage({
        openai, model, message, history: historyToUse,
        priorCoverage: finalizeAnamnesisCoverage(anamnesisData).carrCoverage,
      }) : Promise.resolve(null),
    ]);

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
      extractedData: isLila ? extractedCoverage : parsed.extractedData,
      extractedProfile: parsed.extractedProfile,
      currentStep: parsed.currentStep,
      diceReady: isLila ? parsed.diceReady === true : undefined,
      journeySummary: isLila ? parsed.journeySummary : undefined,
      lilaDialogMemory,
      analysis: analysisResults,
      contextCompacted: !isLila && conversationHistory.length > 20,
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
