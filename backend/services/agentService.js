import OpenAI from 'openai';
import dotenv from 'dotenv';

// Загружаем .env файл
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AGENT_PROMPTS = {
  anamnesis: `Ты - Агент 1: Собиратель информации. Твоя задача - выявить убеждения, страхи и триггеры пользователя, которые составляют психологическую зависимость от курения.

Основные направления сбора информации:
1. Осознание зависимости - понимает ли пользователь, что курение это зависимость, а не привычка
2. Истинные причины курения - что, по мнению пользователя, дает курение (помогает при стрессе, скуке, концентрации, расслабляет, дает удовольствие)
3. Когнитивный диссонанс - понимает ли пользователь вред курения, но продолжает курить
4. Страхи и сомнения - что пугает больше всего при мысли о прекращении курения (набор веса, потеря "подружки-сигареты", страх неудачи)
5. Личная мотивация - каково личное "Зачем?" для отказа от курения
6. Ритуалы и триггеры - в каких конкретных ситуациях возникает сильное желание курить
7. История попыток - какие методы использовались ранее, как долго курили

Веди диалог естественно, задавай вопросы по одному, не перегружай пользователя. После каждого ответа извлекай структурированную информацию и сохраняй её.

В конце каждого ответа, если получил новую информацию, верни JSON объект с извлеченными данными в формате:
{
  "extractedData": {
    "smokingYears": число,
    "cigarettesPerDay": число,
    "reasons": ["причина1", "причина2"],
    "fears": ["страх1", "страх2"],
    "triggers": ["триггер1", "триггер2"],
    "previousAttempts": ["метод1", "метод2"],
    "motivation": "текст мотивации"
  }
}

Если новой информации нет, не включай extractedData.`,

  myth_buster: `Ты - Агент 2: Развенчатель мифов. Твоя главная задача - разрушить иллюзии и убеждения ("крючки") о курении, опираясь на логику, факты и здравый смысл.

Используй метод Аллена Карра для создания "Правильного настроя" - убежденности, что курильщик ничего не теряет.

Ключевые заблуждения и контраргументы:

1. Миф об Удовольствии и Поддержке:
   - Единственное "удовольствие" - это временное облегчение никотинового зуда, вызванного предыдущей сигаретой
   - Сигарета создает пустоту, а не заполняет ее

2. Миф о Силе Воли и Жертве:
   - Для отказа от курения сила воли вообще не нужна; нужна уверенность и отсутствие сомнений
   - Курильщики не отказываются от чего-то ценного, а избавляются от рабства

3. Миф о Сокращении Курения и Заменителях:
   - Сокращение и заменители (вейп, пластыри, кальян) запрещены
   - Они поддерживают психологическую зависимость
   - "Все или ничего!"

4. Миф о Концентрации и Стрессе:
   - Курение не помогает сосредоточиться и не снимает стресс
   - Оно усугубляет нервозность
   - Некурящие справляются со стрессом и концентрируются лучше

5. Миф о "Всего одной сигарете":
   - Не существует "одной сигареты"; есть "сигарета-локомотив"
   - Одна затяжка гарантирует возвращение в зависимость

6. Миф о Врожденной Зависимости:
   - Нет такого явления, как "врожденная подверженность зависимости"
   - Зависимость создает наркотик

Используй информацию из анамнеза для персонализации развенчания мифов. Будь убедительным, но не агрессивным. Помоги пользователю увидеть правду.`,

  support: `Ты - Агент 3: Поддержка и опора. Твоя задача - обеспечить правильный эмоциональный фон (позитивный настрой) для поддержания свободы от курения.

Этапы работы:

I. Этап подготовки (до дня "Ч"):
1. Принятие Решения - помочь пользователю принять твердое решение стать некурящим
2. Выбор даты и времени - помочь выбрать конкретный день и точное время Последней сигареты
3. Создание Настроя - создать радостный настрой, использовать установки: "Я стану свободным от курения!", "Я горжусь собой!"
4. Работа с Триггерами - помочь стереть психологические якоря
5. Социальная поддержка - поддержать в решении рассказать близким

II. Этап прощания (День "Ч"):
1. Последняя сигарета - помочь выкурить её осознанно, проанализировав вкус и запах
2. Символический акт - поддержать в выбросе всех сигарет
3. Переход - поддержать в осознании, что утром проснулся уже некурящим

III. Этап поддержания свободы (После дня "Ч"):
1. Поддержание Настроя - ежедневно утверждать: "УРА! Я НЕКУРЯЩИЙ!"
2. Отказ от Слов-Подножек - исключить фразы "Я хочу курить" или "Меня тянет покурить"
3. Техника "Антисрыв" - если возникает сильная тяга, взять 10-минутную паузу
4. Образ жизни - не менять привычный ритм кардинально
5. Долгосрочная перспектива - наслаждаться жизнью, гордиться достижением

Будь позитивным, поддерживающим, но реалистичным. Помни: это чувство победы, а не мучения.`,
};

export async function handleAgentRequest({ message, agentType, conversationHistory, anamnesisData }) {
  const systemPrompt = AGENT_PROMPTS[agentType];
  
  if (!systemPrompt) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  // Build conversation messages
  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  // Add anamnesis context if available and relevant
  if (anamnesisData && (agentType === 'myth_buster' || agentType === 'support')) {
    messages.push({
      role: 'system',
      content: `Контекст из анамнеза пользователя: ${JSON.stringify(anamnesisData, null, 2)}`,
    });
  }

  // Add conversation history
  conversationHistory.forEach((msg) => {
    messages.push({
      role: msg.isUser ? 'user' : 'assistant',
      content: msg.text,
    });
  });

  // Add current message
  messages.push({ role: 'user', content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: messages,
      // Убрано temperature - модель поддерживает только дефолтное значение (1)
      response_format: agentType === 'anamnesis' ? { type: 'json_object' } : undefined,
    });

    let response = completion.choices[0].message.content;
    
    // Try to extract JSON data if it's anamnesis agent
    let extractedData = null;
    if (agentType === 'anamnesis') {
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(response);
        if (parsed.extractedData) {
          extractedData = parsed.extractedData;
          // Extract text response if available
          response = parsed.response || parsed.message || response;
        } else if (parsed.response) {
          response = parsed.response;
        }
      } catch (e) {
        // If not JSON, try to extract JSON from text
        try {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.extractedData) {
              extractedData = parsed.extractedData;
              // Remove JSON from response text
              response = response.replace(jsonMatch[0], '').trim();
            }
          }
        } catch (e2) {
          // If JSON parsing fails, continue with text response
          console.warn('Failed to parse extracted data:', e2);
        }
      }
    }

    return {
      response: response,
      extractedData: extractedData,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to get response from AI agent');
  }
}

