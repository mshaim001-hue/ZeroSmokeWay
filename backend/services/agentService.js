import OpenAI from 'openai';
import dotenv from 'dotenv';
import { searchKnowledgeBase } from './knowledgeBase.js';

// Загружаем .env файл
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const NATURAL_TEXT_RULES = `
## ПРАВИЛА ЕСТЕСТВЕННОГО ТЕКСТА

### ЯЗЫК
- **Простые слова:** пиши так, будто общаешься с другом; избегай сложной лексики.
- **Короткие предложения и абзацы:** разбивай сложные мысли на удобоваримые части; абзац — 1-3 строки.
- **Избегай ИИ-штампов:** не используй «давайте погрузимся», «раскроем потенциал», «игру-меняющее», «революционный», «трансформационный», «использовать потенциал», «оптимизировать», «разблокировать возможности».
- **Будь прямым:** говори, что имеешь в виду, без лишних слов.
- **Естественный поток:** нормально начинать фразы с «и», «но» или «так что».
- **Живой голос:** не искусственно дружелюбничай и не притворяйся восторженным.
- **Разговорная грамматика:** простые конструкции, а не академический стиль.

### СТИЛЬ
- **Убирай воду:** сокращай лишние прилагательные и наречия.
- **Примеры вместо абстракций:** показывай на конкретных случаях.
- **Честность:** признай ограничения, не переусердствуй с продажностью.
- **Как в мессенджере:** пиши так же прямо и просто, как в чате.
- **Плавные переходы:** используй простые связки вроде «смотри», «и», «но».
- **Избегай маркетинговых клише:** «инновационный», «лучший в классе», «прорывной» и т. п.

### ЗАПРЕЩЁННЫЕ ФРАЗЫ
- «Давайте погрузимся…»
- «Раскройте свой потенциал»
- «Игру-меняющее решение»
- «Революционный подход»
- «Трансформируйте свою жизнь»
- «Разблокируйте секреты»
- «Используйте эту стратегию»
- «Оптимизируйте рабочий процесс»

### ЛУЧШЕ ИСПОЛЬЗОВАТЬ
- «Вот как это работает»
- «Это может вам помочь»
- «Вот что я нашёл»
- «Это может сработать у вас»
- «Смотри, какая штука»
- «Вот почему это важно»
- «Но есть проблема»
- «Так что произошло вот что»

### ФИНАЛЬНАЯ ПРОВЕРКА
Перед отправкой убедись, что текст:
- Звучит так, будто ты говоришь вслух.
- Использует слова, которыми говорит обычный человек.
- Не похож на маркетинговый слоган.
- Честен и искренен.
- Быстро переходит к сути.
`;

const AGENT_PROMPTS = {
  anamnesis: `Ты - Агент 1: Собиратель информации. Твоя задача - собрать информацию о пользователе и выявить убеждения, страхи и триггеры, которые составляют психологическую зависимость от курения.

ВАЖНО: Используй информацию из базы знаний (книги Аллена Карра, Астарова, Кудряшова) для более эффективного сбора информации. Если в контексте есть релевантная информация из книг - используй её для формулировки вопросов и понимания ответов пользователя.

${NATURAL_TEXT_RULES}

ПОРЯДОК СБОРА ИНФОРМАЦИИ:

Этап 1: Знакомство и базовая информация о пользователе
- Сначала узнай имя пользователя (как к нему обращаться)
- Затем короткими вопросами узнай: возраст, откуда (город/страна), чем занимается (профессия/род деятельности)
- Будь дружелюбным и естественным, задавай вопросы по одному

Этап 2: Информация о курении
После того как узнал базовую информацию о пользователе, переходи к вопросам о курении:
1. Осознание зависимости - понимает ли пользователь, что курение это зависимость, а не привычка
2. Истинные причины курения - что, по мнению пользователя, дает курение (помогает при стрессе, скуке, концентрации, расслабляет, дает удовольствие)
3. Когнитивный диссонанс - понимает ли пользователь вред курения, но продолжает курить
4. Страхи и сомнения - что пугает больше всего при мысли о прекращении курения (набор веса, потеря "подружки-сигареты", страх неудачи)
5. Личная мотивация - каково личное "Зачем?" для отказа от курения
6. Ритуалы и триггеры - в каких конкретных ситуациях возникает сильное желание курить
7. История попыток - какие методы использовались ранее, как долго курили

ВАЖНО: Используй имя пользователя в диалоге, если уже узнал его. Персонализируй вопросы на основе уже собранной информации (возраст, профессия и т.д.).

Веди диалог естественно, задавай вопросы по одному, не перегружай пользователя. После каждого ответа извлекай структурированную информацию и сохраняй её.

В конце каждого ответа, если получил новую информацию, верни JSON объект с извлеченными данными в формате:
{
  "message": "твой ответ пользователю",
  "extractedProfile": {
    "name": "имя пользователя",
    "age": число,
    "location": "город/страна",
    "occupation": "профессия/род деятельности"
  },
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

Если новой информации нет, не включай соответствующие поля. Всегда включай поле "message" с текстом ответа.`,

  myth_buster: `Ты - Агент 2: Развенчатель мифов. Твоя главная задача - разрушить иллюзии и убеждения ("крючки") о курении, опираясь на логику, факты и здравый смысл.

ВАЖНО: Используй информацию из базы знаний (книги Аллена Карра, Астарова, Кудряшова) для развенчания мифов. Цитируй конкретные аргументы из книг, но делай это естественно, не упоминая источники напрямую.

${NATURAL_TEXT_RULES}

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

ВАЖНО: Используй техники и методы из базы знаний (книги Аллена Карра, Астарова, Кудряшова) для поддержки пользователя. Применяй конкретные техники из книг, адаптируя их под ситуацию пользователя.

${NATURAL_TEXT_RULES}

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

export async function handleAgentRequest({ message, agentType, conversationHistory, anamnesisData, userProfile }) {
  const systemPrompt = AGENT_PROMPTS[agentType];
  
  if (!systemPrompt) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  // Поиск релевантной информации в базе знаний
  let knowledgeContext = '';
  try {
    // Формируем запрос для поиска: текущее сообщение + контекст агента
    const searchQuery = `${message} ${agentType === 'myth_buster' ? 'мифы о курении развенчание' : agentType === 'support' ? 'поддержка отказ от курения' : 'сбор информации о курении'}`;
    const relevantChunks = await searchKnowledgeBase(searchQuery, 3);
    
    if (relevantChunks.length > 0) {
      console.log(`📚 Найдено ${relevantChunks.length} релевантных фрагментов из базы знаний`);
      knowledgeContext = '\n\n=== РЕЛЕВАНТНАЯ ИНФОРМАЦИЯ ИЗ БАЗЫ ЗНАНИЙ (книги Аллена Карра, Астарова, Кудряшова) ===\n';
      relevantChunks.forEach((chunk, index) => {
        knowledgeContext += `\n[Фрагмент ${index + 1} из "${chunk.source}"]\n${chunk.text}\n`;
      });
      knowledgeContext += '\n=== КОНЕЦ ИНФОРМАЦИИ ИЗ БАЗЫ ЗНАНИЙ ===\n';
      knowledgeContext += '\nВАЖНО: Используй эту информацию для ответа. Адаптируй под ситуацию пользователя. Не упоминай источники напрямую, но используй конкретные аргументы и техники из книг.';
    } else {
      console.log('⚠️  Релевантные фрагменты не найдены в базе знаний');
    }
  } catch (error) {
    console.warn('⚠️  Ошибка при поиске в базе знаний:', error.message);
  }

  // Build conversation messages
  const messages = [
    { 
      role: 'system', 
      content: systemPrompt + knowledgeContext 
    },
  ];

  // Add user profile context if available
  if (userProfile) {
    messages.push({
      role: 'system',
      content: `ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ (используй эту информацию для персонализации диалога):\n${JSON.stringify(userProfile, null, 2)}\n\nОбращайся к пользователю по имени, если оно указано. Учитывай возраст, профессию и другие данные при формулировке вопросов и ответов.`,
    });
  }

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

  // Логирование запроса
  console.log('\n=== OpenAI API Request ===');
  console.log('Agent Type:', agentType);
  console.log('Model:', process.env.OPENAI_MODEL || 'gpt-5-mini');
  console.log('Messages count:', messages.length);
  console.log('Last user message:', message);
  if (userProfile) {
    console.log('User Profile:', JSON.stringify(userProfile, null, 2));
  }
  if (anamnesisData) {
    console.log('Anamnesis Data:', JSON.stringify(anamnesisData, null, 2));
  }
  console.log('Messages:', JSON.stringify(messages, null, 2));

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-mini',
      messages: messages,
      // Убрано temperature - модель поддерживает только дефолтное значение (1)
      response_format: agentType === 'anamnesis' ? { type: 'json_object' } : undefined,
    });

    // Логирование ответа
    console.log('\n=== OpenAI API Response ===');
    console.log('Raw response:', completion.choices[0].message.content);
    console.log('Usage:', JSON.stringify(completion.usage, null, 2));

    let response = completion.choices[0].message.content;
    
    // Try to extract JSON data if it's anamnesis agent
    let extractedData = null;
    let extractedProfile = null;
    if (agentType === 'anamnesis') {
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(response);
        
        // Извлекаем extractedData если есть
        if (parsed.extractedData) {
          extractedData = parsed.extractedData;
        }
        
        // Извлекаем extractedProfile если есть
        if (parsed.extractedProfile) {
          extractedProfile = parsed.extractedProfile;
        }
        
        // Извлекаем текстовое сообщение (может быть в разных полях)
        if (parsed.message) {
          response = parsed.message;
        } else if (parsed.response) {
          response = parsed.response;
        } else if (parsed.text) {
          response = parsed.text;
        } else if (parsed.content) {
          response = parsed.content;
        } else if (!parsed.extractedData && !parsed.extractedProfile) {
          // Если нет extractedData/extractedProfile и нет текстового поля, используем весь JSON как строку
          response = JSON.stringify(parsed, null, 2);
        }
      } catch (e) {
        // If not JSON, try to extract JSON from text
        try {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.extractedData) {
              extractedData = parsed.extractedData;
            }
            if (parsed.extractedProfile) {
              extractedProfile = parsed.extractedProfile;
            }
            // Удаляем JSON из текста
            if (parsed.message) {
              response = response.replace(jsonMatch[0], '').trim() || parsed.message;
            } else {
              response = response.replace(jsonMatch[0], '').trim();
            }
          }
        } catch (e2) {
          // If JSON parsing fails, continue with text response
          console.warn('Failed to parse extracted data:', e2);
        }
      }
    } else {
      // Для других агентов тоже проверяем JSON обертку
      try {
        const parsed = JSON.parse(response);
        if (parsed.message) {
          response = parsed.message;
        } else if (parsed.response) {
          response = parsed.response;
        }
      } catch (e) {
        // Не JSON, оставляем как есть
      }
    }

    // Логирование финального результата
    console.log('\n=== Processed Response ===');
    console.log('Final response text:', response);
    if (extractedData) {
      console.log('Extracted data:', JSON.stringify(extractedData, null, 2));
    }
    if (extractedProfile) {
      console.log('Extracted profile:', JSON.stringify(extractedProfile, null, 2));
    }
    console.log('================================\n');

    return {
      response: response,
      extractedData: extractedData,
      extractedProfile: extractedProfile,
    };
  } catch (error) {
    console.error('\n=== OpenAI API Error ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error status:', error.status);
    console.error('==========================\n');
    throw new Error('Failed to get response from AI agent');
  }
}

