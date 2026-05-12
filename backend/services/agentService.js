import OpenAI from 'openai';
import dotenv from 'dotenv';
import { searchKnowledgeBase } from './knowledgeBase.js';
import { getAgentPrompt } from './agentConfig.js';
import { handleAdaptiveAnamnesis, isAnamnesisComplete } from './adaptiveAnamnesisService.js';
import { analyzeResponseWithSubAgents } from './subAgentService.js';
import { createCompactContext } from './contextManagerService.js';
import {
  formatAuthContextForPrompt,
  formatAnamnesisAuthRules,
  formatSecondaryAgentAuthRules,
} from './authContext.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Основной обработчик запросов к агентам
 * Для anamnesis использует адаптивный режим с function calling (если включен)
 */
export async function handleAgentRequest({ 
  message, 
  agentType, 
  conversationHistory, 
  anamnesisData, 
  userProfile,
  useAdaptiveMode = false, // Новый параметр для включения адаптивного режима
  orchestratorInstruction = null,
  authContext = null,
}) {
  const auth = authContext ?? {
    isAuthenticated: false,
    userTurnCount: conversationHistory.filter((m) => m.isUser).length,
    assistantTurnCount: conversationHistory.filter((m) => !m.isUser).length,
  };
  const authSystemBlock = `${formatAuthContextForPrompt(auth)}${agentType === 'anamnesis' ? formatAnamnesisAuthRules(auth) : formatSecondaryAgentAuthRules(agentType, auth)}`;

  // Для anamnesis с адаптивным режимом используем специальный обработчик
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
    
    // Проверяем, завершен ли анамнез
    const complete = isAnamnesisComplete(result.coverage);
    
    return {
      ...result,
      isComplete: complete,
      extractedData: result.extractedData || previousExtractedData
    };
  }
  
  // Стандартный обработчик для остальных агентов или anamnesis без адаптивного режима
  const systemPrompt = await getAgentPrompt(agentType);
  
  if (!systemPrompt) throw new Error(`Unknown agent: ${agentType}`);

  let knowledgeContext = '';
  try {
    const searchQuery = `${message} ${agentType === 'myth_buster' ? 'мифы о курении' : 'психология курильщика'}`;
    const relevantChunks = await searchKnowledgeBase(searchQuery, 2, agentType);
    if (relevantChunks.length > 0) {
      knowledgeContext = '\n\nИНФОРМАЦИЯ ИЗ КНИГ ДЛЯ ТЕБЯ:\n' + relevantChunks.map(c => c.text).join('\n---\n');
    }
  } catch (e) {
    console.warn('KB search failed', e.message);
  }

  // Используем компактный контекст для длинных диалогов
  const useCompactContext = conversationHistory.length > 20;
  const contextData = useCompactContext 
    ? createCompactContext(conversationHistory, agentType)
    : { messages: conversationHistory };

  const messages = [
    { role: 'system', content: systemPrompt + knowledgeContext },
    { role: 'system', content: authSystemBlock },
  ];

  if (userProfile) {
    messages.push({ role: 'system', content: `Контекст юзера: ${JSON.stringify(userProfile)}` });
  }

  if (anamnesisData && agentType !== 'anamnesis') {
    messages.push({ role: 'system', content: `Анамнез: ${JSON.stringify(anamnesisData)}` });
  }

  // Используем компактную историю или обычную
  const historyToUse = useCompactContext ? contextData.messages : conversationHistory;
  historyToUse.slice(-8).forEach((msg) => {
    messages.push({ role: msg.isUser ? 'user' : 'assistant', content: msg.text });
  });

  // Инструкция оркестратора — последним системным блоком, чтобы агент её не проигнорировал
  if (orchestratorInstruction) {
    let instruction = `НА ЭТОТ ОТВЕТ СДЕЛАЙ ТОЛЬКО СЛЕДУЮЩЕЕ (не пиши общее приветствие типа "Привет, рад познакомиться" — сделай именно то, что ниже):\n${orchestratorInstruction}`;
    if (agentType === 'myth_buster') {
      instruction += '\n\nНе утверждай "это иллюзия" или "учёные доказали" — веди одним вопросом или аналогией из его опыта. Закончи вопросом или приглашением ("как тебе мысль?", "хочешь с другой стороны посмотреть?"), чтобы он понимал, что писать дальше.';
    }
    messages.push({ role: 'system', content: instruction });
  }

  messages.push({ role: 'user', content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.4-nano',
      messages: messages,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    
    let finalResponse = parsed.message;
    let analysisResults = null;

    // Опционально: используем sub-агентов для анализа и улучшения ответа
    const useSubAgents = process.env.USE_SUB_AGENTS === 'true';
    if (useSubAgents) {
      const analysis = await analyzeResponseWithSubAgents({
        agentResponse: finalResponse,
        agentType,
        userMessage: message,
        extractedData: parsed.extractedData,
        conversationHistory: historyToUse
      });
      
      if (analysis.wasImproved) {
        finalResponse = analysis.improvedResponse;
        analysisResults = analysis.analysis;
        console.log('✅ Sub-агенты улучшили ответ');
      }
    }

    return {
      response: finalResponse,
      extractedData: parsed.extractedData,
      extractedProfile: parsed.extractedProfile,
      currentStep: parsed.currentStep,
      analysis: analysisResults,
      contextCompacted: useCompactContext,
      contextStats: useCompactContext ? contextData.stats : null
    };
  } catch (error) {
    console.error('AI Error:', error);
    throw new Error('Не удалось получить ответ от Алекса');
  }
}