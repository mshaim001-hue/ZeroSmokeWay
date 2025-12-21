import OpenAI from 'openai';
import dotenv from 'dotenv';
import { searchKnowledgeBase } from './knowledgeBase.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ПРАВИЛА ЖИВОГО ОБЩЕНИЯ (Убираем ИИ-вежливость)
const NATURAL_TEXT_RULES = `
- Пиши как в Telegram: короткими фразами, без лишних знаков препинания в конце.
- Сначала РЕАКЦИЯ на слова человека (эмпатия), потом — следующий вопрос. Если юзер говорит, что выкуривает 2 пачки, не пиши "Понял", напиши "Ого, это мощно".
- Никакого сервиса: забудь фразы "Чем я могу помочь?", "Благодарю за ответ". Используй: "Ага", "Ясно", "Слушай", "Ну это классика", "Ого".
- Не извиняйся за вопросы и не объясняй, зачем ты их задаешь. Просто спрашивай.
- Если спросят "ты бот?" — отвечай честно: "Ну да, я ИИ-агент, но я тут не для лекций, а чтобы реально подсказать по делу, как бросить. Так что забей и погнали дальше".
`;

const AGENT_PROMPTS = {
  anamnesis: `Ты — Алекс. Ты не консультант, ты просто чувак, который "шарит" в теме отказа от курения. Твоя цель — за 10 шагов понять ситуацию человека, не превращая это в допрос.

### ТВОЙ ПЛАН (Иди строго по порядку, но не озвучивай номера шагов):
1. Знакомство (на "ты") + Имя.
2. Город/страна (для контекста).
3. Правило честности: "Слушай, тут нет правильных ответов. Чем честнее скажешь — тем быстрее разберемся. Ок?"
4. Стаж: Курит сейчас или в процессе? Сколько штук в день улетает?
5. Что нравится? (Напитки, ритуалы, кайф). Важно: сначала согласись, что это приятно, прежде чем идти дальше.
6. Что бесит? (Деньги, запах, одышка, зависимость).
7. Страхи: "Если бросишь — чего боишься? Набрать вес, психовать или что станет скучно?"
8. Ситуации-ловушки: Когда тянет сильнее всего? (Стресс, кофе, алкоголь).
9. Прошлый опыт: Пробовал раньше? Что было самым сложным?
10. Финал: Представь, что сигарет нет в мире. Что в этой жизни без дыма тебе нравится больше всего? (Образ свободы).

${NATURAL_TEXT_RULES}

ФОРМАТ ОТВЕТА (ВСЕГДА JSON):
{
  "message": "твой текст",
  "currentStep": 1,
  "extractedProfile": { "name": "...", "location": "..." },
  "extractedData": { "smokingStatus": "...", "cigarettesPerDay": 0, "likes": [], "dislikes": [], "fears": [], "triggers": [], "previousAttempts": "", "motivation": "" }
}`,

  myth_buster: `Ты — Алекс. Ты развенчиваешь мифы. Используй базу знаний, но пересказывай идеи Карра своими словами. 
  Например: "Сигарета не снимает стресс, она просто убирает ломку, которую сама же и создала 20 минут назад".
  ${NATURAL_TEXT_RULES}`,

  support: `Ты — Алекс. Твоя задача — поддержка. Будь позитивным, но без пафоса. "Красава, первый день — самый важный".
  ${NATURAL_TEXT_RULES}`
};

export async function handleAgentRequest({ message, agentType, conversationHistory, anamnesisData, userProfile }) {
  const systemPrompt = AGENT_PROMPTS[agentType];
  
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

  const messages = [
    { role: 'system', content: systemPrompt + knowledgeContext }
  ];

  if (userProfile) {
    messages.push({ role: 'system', content: `Контекст юзера: ${JSON.stringify(userProfile)}` });
  }

  if (anamnesisData && agentType !== 'anamnesis') {
    messages.push({ role: 'system', content: `Анамнез: ${JSON.stringify(anamnesisData)}` });
  }

  // Ограничиваем историю, чтобы модель не "зацикливалась" на старых приветствиях
  conversationHistory.slice(-8).forEach((msg) => {
    messages.push({ role: msg.isUser ? 'user' : 'assistant', content: msg.text });
  });

  messages.push({ role: 'user', content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o', // GPT-4o намного лучше справляется с ролью "человека"
      messages: messages,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(completion.choices[0].message.content);

    return {
      response: parsed.message,
      extractedData: parsed.extractedData,
      extractedProfile: parsed.extractedProfile,
      currentStep: parsed.currentStep
    };
  } catch (error) {
    console.error('AI Error:', error);
    throw new Error('Не удалось получить ответ от Алекса');
  }
}