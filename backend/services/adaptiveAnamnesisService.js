import OpenAI from 'openai';
import dotenv from 'dotenv';
import { searchKnowledgeBase } from './knowledgeBase.js';
import { getAgentPrompt } from './agentConfig.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Function definitions для адаптивного анамнеза
 * Позволяют агенту задавать уточняющие вопросы и извлекать данные структурированно
 */
const ANAMNESIS_FUNCTIONS = [
  {
    name: 'ask_follow_up_question',
    description: 'Задай уточняющий вопрос пользователю для более глубокого понимания ситуации. Используй этот инструмент, когда ответ пользователя недостаточно информативен или нужны детали.',
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'Уточняющий вопрос на русском языке в стиле естественного общения (коротко, без лишней вежливости)'
        },
        context: {
          type: 'string',
          description: 'Почему нужен этот вопрос? Что мы хотим понять? (для логирования)'
        },
        topic: {
          type: 'string',
          enum: ['name', 'location', 'smoking_status', 'smoking_details', 'likes', 'dislikes', 'fears', 'triggers', 'previous_attempts', 'motivation', 'other'],
          description: 'Тема вопроса'
        }
      },
      required: ['question', 'topic']
    }
  },
  {
    name: 'extract_anamnesis_data',
    description: 'Извлеки структурированные данные из ответа пользователя. Используй после того, как получил достаточно информации по теме.',
    parameters: {
      type: 'object',
      properties: {
        extractedProfile: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Имя пользователя (если упомянуто)' },
            location: { type: 'string', description: 'Город или страна (если упомянуто)' }
          }
        },
        extractedData: {
          type: 'object',
          properties: {
            smokingStatus: { type: 'string', description: 'Статус: курит сейчас, в процессе отказа, бросил и т.д.' },
            cigarettesPerDay: { type: 'integer', description: 'Количество сигарет в день (число или null)' },
            smokingYears: { type: 'integer', description: 'Сколько лет курит (число или null)' },
            likes: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Что нравится в курении: конкретные моменты, ритуалы, ощущения'
            },
            dislikes: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Что не нравится: деньги, запах, зависимость и т.д.'
            },
            fears: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Страхи при отказе: набрать вес, нервы, скука и т.д.'
            },
            triggers: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Триггеры: когда тянет сильнее всего (стресс, кофе, после еды и т.д.)'
            },
            previousAttempts: { type: 'string', description: 'Опыт предыдущих попыток бросить (если упомянуто)' },
            motivation: { type: 'string', description: 'Мотивация: что привлекает в жизни без курения' }
          }
        },
        coverage: {
          type: 'object',
          properties: {
            name: { type: 'boolean' },
            location: { type: 'boolean' },
            smokingStatus: { type: 'boolean' },
            smokingDetails: { type: 'boolean' },
            likes: { type: 'boolean' },
            dislikes: { type: 'boolean' },
            fears: { type: 'boolean' },
            triggers: { type: 'boolean' },
            previousAttempts: { type: 'boolean' },
            motivation: { type: 'boolean' }
          },
          description: 'Отметь какие темы уже покрыты (true/false)'
        }
      },
      required: ['extractedData', 'coverage']
    }
  }
];

/**
 * Обрабатывает запрос с адаптивным анамнезом
 * Поддерживает function calling для динамических вопросов
 */
export async function handleAdaptiveAnamnesis({
  message,
  conversationHistory,
  previousExtractedData = null,
  previousCoverage = null,
  authSystemBlock = '',
}) {
  const systemPrompt = await getAgentPrompt('anamnesis');

  let knowledgeContext = '';
  try {
    const searchQuery = `${message} психология курильщика анамнез`;
    const relevantChunks = await searchKnowledgeBase(searchQuery, 2, 'anamnesis');
    if (relevantChunks.length > 0) {
      knowledgeContext = '\n\nИНФОРМАЦИЯ ИЗ КНИГ ДЛЯ ТЕБЯ:\n' + relevantChunks.map((c) => c.text).join('\n---\n');
    }
  } catch (e) {
    console.warn('KB search failed', e.message);
  }

  const messages = [{ role: 'system', content: systemPrompt + knowledgeContext }];
  if (authSystemBlock) {
    messages.push({ role: 'system', content: authSystemBlock });
  }

  // Добавляем информацию о уже собранных данных
  if (previousExtractedData) {
    messages.push({ 
      role: 'system', 
      content: `Уже собранные данные: ${JSON.stringify(previousExtractedData)}\nПокрытие тем: ${JSON.stringify(previousCoverage)}`
    });
  }

  // Добавляем историю
  conversationHistory.slice(-10).forEach((msg) => {
    messages.push({ role: msg.isUser ? 'user' : 'assistant', content: msg.text });
  });

  messages.push({ role: 'user', content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.4-nano',
      messages: messages,
      tools: ANAMNESIS_FUNCTIONS.map(fn => ({ type: 'function', function: fn })),
      tool_choice: 'auto', // Модель сама решает, вызывать ли функции
      response_format: null // Отключаем JSON mode, так как используем tools
    });

    const messageResponse = completion.choices[0].message;
    
    // Проверяем, вызвал ли модель функцию
    if (messageResponse.tool_calls && messageResponse.tool_calls.length > 0) {
      const toolCall = messageResponse.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      if (functionName === 'ask_follow_up_question') {
        // Агент хочет задать уточняющий вопрос
        return {
          response: functionArgs.question,
          needsFollowUp: true,
          questionContext: functionArgs.context,
          questionTopic: functionArgs.topic,
          extractedData: previousExtractedData,
          coverage: previousCoverage
        };
      } else if (functionName === 'extract_anamnesis_data') {
        // Агент извлек данные
        const extractedData = {
          ...previousExtractedData,
          ...functionArgs.extractedData,
          extractedProfile: functionArgs.extractedProfile || previousExtractedData?.extractedProfile
        };
        
        return {
          response: functionArgs.extractedData.motivation 
            ? 'Отлично, я получил всю необходимую информацию. Теперь можем перейти к следующему этапу.'
            : 'Понял, продолжаем.',
          extractedData: extractedData,
          coverage: functionArgs.coverage,
          needsFollowUp: false
        };
      }
    }

    // Если функция не вызвана, но есть ответ - используем его как обычный ответ
    // Это fallback для совместимости
    let parsed;
    try {
      parsed = JSON.parse(messageResponse.content);
    } catch (e) {
      // Если не JSON, возвращаем как есть
      return {
        response: messageResponse.content,
        extractedData: previousExtractedData,
        coverage: previousCoverage,
        needsFollowUp: false
      };
    }

    return {
      response: parsed.message || messageResponse.content,
      extractedData: parsed.extractedData || previousExtractedData,
      extractedProfile: parsed.extractedProfile,
      coverage: previousCoverage,
      needsFollowUp: false
    };
  } catch (error) {
    console.error('Adaptive Anamnesis Error:', error);
    throw new Error('Не удалось получить ответ от Алекса');
  }
}

/**
 * Проверяет, достаточно ли данных для перехода к следующему агенту
 */
export function isAnamnesisComplete(coverage) {
  if (!coverage) return false;
  
  const requiredTopics = [
    'smokingStatus',
    'smokingDetails', 
    'likes',
    'dislikes',
    'fears',
    'triggers'
  ];
  
  // Проверяем, что хотя бы 80% основных тем покрыто
  const coveredCount = requiredTopics.filter(topic => coverage[topic] === true).length;
  return coveredCount >= Math.ceil(requiredTopics.length * 0.8);
}
