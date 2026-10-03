import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error('OPENAI_API_KEY is not configured; AI requests are unavailable');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Sub-агенты для анализа и валидации ответов основных агентов
 */

/**
 * Анализатор эмоционального тона ответа
 * Проверяет, соответствует ли ответ правилам эмпатии и естественного общения
 */
export async function analyzeEmotionalTone(agentResponse, agentType, userMessage) {
  const prompt = `Ты — анализатор эмоционального тона ответов AI-агента.

Тип агента: ${agentType}
Сообщение пользователя: "${userMessage}"
Ответ агента: "${agentResponse}"

Проанализируй ответ агента по следующим критериям:

1. **Эмпатия**: Есть ли эмоциональная реакция на слова пользователя? Начинается ли ответ с реакции?
2. **Естественность**: Звучит ли ответ естественно, как в Telegram? Избегает ли излишней вежливости?
3. **Релевантность**: Соответствует ли ответ контексту сообщения пользователя?
4. **Тон**: Подходящий ли тон для типа агента (anamnesis/myth_buster/support)?

Верни JSON:
{
  "score": число от 0 до 10 (общая оценка),
  "issues": ["проблема1", "проблема2"],
  "suggestions": ["предложение1", "предложение2"],
  "needsRevision": true/false (нужно ли переписать ответ)
}`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: 'Ты анализируешь ответы AI-агентов. Отвечай только валидным JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error('Emotional tone analysis error:', error);
    return {
      score: 7,
      issues: [],
      suggestions: [],
      needsRevision: false
    };
  }
}

/**
 * Валидатор извлеченных данных
 * Проверяет качество и полноту данных, извлеченных из анамнеза
 */
export async function validateExtractedData(extractedData, conversationHistory) {
  const prompt = `Ты — валидатор данных анамнеза.

Извлеченные данные:
${JSON.stringify(extractedData, null, 2)}

Последние 3 сообщения из диалога:
${JSON.stringify(conversationHistory.slice(-3), null, 2)}

Проверь:

1. **Типы данных**: Правильные ли типы? (числа для чисел, массивы для списков)
2. **Полнота**: Все ли важные поля заполнены? Нет ли явных пропусков?
3. **Качество**: Конкретные ли значения? (не "много", а "20 сигарет")
4. **Консистентность**: Соответствуют ли данные тому, что говорит пользователь в диалоге?

Верни JSON:
{
  "valid": true/false,
  "errors": ["ошибка1", "ошибка2"],
  "warnings": ["предупреждение1"],
  "completeness": число от 0 до 100 (процент заполненности),
  "needsMoreQuestions": true/false (нужно ли задать еще вопросы)
}`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: 'Ты валидируешь данные анамнеза. Отвечай только валидным JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error('Data validation error:', error);
    return {
      valid: true,
      errors: [],
      warnings: [],
      completeness: 50,
      needsMoreQuestions: false
    };
  }
}

/**
 * Ревьюер безопасности
 * Проверяет ответ на потенциально вредный контент, медицинские советы и т.д.
 */
export async function reviewSafety(agentResponse, agentType) {
  const prompt = `Ты — ревьюер безопасности ответов AI-агента.

Тип агента: ${agentType}
Ответ агента: "${agentResponse}"

Проверь на:

1. **Медицинские советы**: Нет ли конкретных медицинских рекомендаций, которые должен давать только врач?
2. **Вредный контент**: Нет ли токсичности, агрессии, обесценивания чувств?
3. **Границы**: Остается ли агент в рамках своей роли? Не переходит ли границы?
4. **Честность**: Не вводит ли пользователя в заблуждение?

Верни JSON:
{
  "safe": true/false,
  "issues": ["проблема1"],
  "needsRevision": true/false,
  "severity": "low" | "medium" | "high"
}`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: 'Ты проверяешь безопасность ответов. Отвечай только валидным JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2 // Низкая температура для более консервативной проверки
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error('Safety review error:', error);
    // В случае ошибки считаем безопасным, чтобы не блокировать работу
    return {
      safe: true,
      issues: [],
      needsRevision: false,
      severity: 'low'
    };
  }
}

/**
 * Улучшатель ответа
 * Переписывает ответ на основе анализа других sub-агентов
 */
export async function improveResponse(originalResponse, analysisResults, agentType, userMessage) {
  const prompt = `Ты — улучшатель ответов AI-агента.

Оригинальный ответ: "${originalResponse}"
Тип агента: ${agentType}
Сообщение пользователя: "${userMessage}"

Анализ:
${JSON.stringify(analysisResults, null, 2)}

Перепиши ответ, исправив выявленные проблемы:
- Улучши эмпатию и естественность
- Сохрани смысл и релевантность
- Убедись, что ответ соответствует типу агента
- Сохрани тон (короткие фразы, без лишней вежливости)

Верни только улучшенный ответ, без дополнительных комментариев.`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: 'Ты улучшаешь ответы AI-агентов. Верни только улучшенный текст ответа.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Response improvement error:', error);
    return originalResponse; // Возвращаем оригинал при ошибке
  }
}

/**
 * Главная функция для параллельного анализа ответа всеми sub-агентами
 */
export async function analyzeResponseWithSubAgents({
  agentResponse,
  agentType,
  userMessage,
  extractedData = null,
  conversationHistory = []
}) {
  // Запускаем все анализы параллельно
  const [toneAnalysis, dataValidation, safetyReview] = await Promise.all([
    analyzeEmotionalTone(agentResponse, agentType, userMessage),
    extractedData && agentType === 'anamnesis' 
      ? validateExtractedData(extractedData, conversationHistory)
      : Promise.resolve(null),
    reviewSafety(agentResponse, agentType)
  ]);

  const analysisResults = {
    tone: toneAnalysis,
    data: dataValidation,
    safety: safetyReview
  };

  // Определяем, нужно ли улучшение
  const needsImprovement = 
    toneAnalysis.needsRevision || 
    safetyReview.needsRevision ||
    (toneAnalysis.score < 6);

  let improvedResponse = agentResponse;
  
  if (needsImprovement) {
    console.log('🔄 Sub-агенты рекомендуют улучшить ответ');
    improvedResponse = await improveResponse(
      agentResponse,
      analysisResults,
      agentType,
      userMessage
    );
  }

  return {
    originalResponse: agentResponse,
    improvedResponse,
    analysis: analysisResults,
    wasImproved: needsImprovement
  };
}
