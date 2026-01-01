/**
 * Сервис для управления контекстом диалогов
 * Реализует экспорт/компакт функциональность для длинных диалогов
 */

/**
 * Экспортирует важные моменты из диалога, убирая служебную информацию
 */
export function exportConversation(conversationHistory) {
  // Убираем служебные сообщения и оставляем только суть
  const exported = conversationHistory
    .filter(msg => {
      // Фильтруем слишком короткие сообщения или служебные
      if (msg.text.length < 10) return false;
      // Можно добавить другие фильтры
      return true;
    })
    .map(msg => ({
      text: msg.text,
      isUser: msg.isUser,
      timestamp: msg.timestamp
    }));

  return {
    messages: exported,
    totalMessages: conversationHistory.length,
    exportedMessages: exported.length,
    exportedAt: new Date().toISOString()
  };
}

/**
 * Создает компактную версию диалога
 * Оставляет ключевые моменты и последние N сообщений
 */
export function compactConversation(conversationHistory, options = {}) {
  const {
    keepLastN = 10, // Последние N сообщений всегда оставляем
    minMessageLength = 20, // Минимальная длина важного сообщения
    extractKeyPoints = true // Извлекать ключевые моменты
  } = options;

  // Всегда оставляем последние N сообщений
  const recentMessages = conversationHistory.slice(-keepLastN);

  // Если диалог короткий, возвращаем как есть
  if (conversationHistory.length <= keepLastN) {
    return {
      messages: conversationHistory,
      compacted: false,
      originalLength: conversationHistory.length
    };
  }

  // Извлекаем ключевые моменты из начала диалога
  let keyMessages = [];
  if (extractKeyPoints) {
    const earlierMessages = conversationHistory.slice(0, -keepLastN);
    
    // Оставляем:
    // 1. Первое сообщение агента (приветствие)
    const firstAgentMessage = earlierMessages.find(m => !m.isUser);
    if (firstAgentMessage) {
      keyMessages.push(firstAgentMessage);
    }

    // 2. Сообщения пользователя с важной информацией (длинные сообщения)
    const importantUserMessages = earlierMessages
      .filter(m => m.isUser && m.text.length >= minMessageLength)
      .slice(0, 5); // Максимум 5 важных сообщений
    keyMessages.push(...importantUserMessages);

    // 3. Сообщения агента с извлеченными данными (можно определить по структуре)
    // Это будет зависеть от вашей структуры данных
  }

  // Объединяем ключевые моменты и последние сообщения
  const compactedMessages = [
    ...keyMessages,
    ...recentMessages
  ];

  // Убираем дубликаты (если ключевые моменты пересекаются с последними)
  const uniqueMessages = [];
  const seenTexts = new Set();
  for (const msg of compactedMessages) {
    const key = `${msg.isUser}-${msg.text.substring(0, 50)}`;
    if (!seenTexts.has(key)) {
      seenTexts.add(key);
      uniqueMessages.push(msg);
    }
  }

  return {
    messages: uniqueMessages,
    compacted: true,
    originalLength: conversationHistory.length,
    compactedLength: uniqueMessages.length,
    reduction: conversationHistory.length - uniqueMessages.length
  };
}

/**
 * Создает summary диалога для контекста
 */
export function createConversationSummary(conversationHistory, agentType) {
  if (conversationHistory.length === 0) {
    return null;
  }

  const userMessages = conversationHistory.filter(m => m.isUser);
  const agentMessages = conversationHistory.filter(m => !m.isUser);

  // Извлекаем ключевые темы из сообщений пользователя
  const userTopics = extractTopics(userMessages.map(m => m.text).join(' '));
  
  // Последние несколько сообщений агента
  const recentAgentContext = agentMessages.slice(-3).map(m => m.text).join(' ');

  return {
    agentType,
    totalMessages: conversationHistory.length,
    userMessageCount: userMessages.length,
    agentMessageCount: agentMessages.length,
    topics: userTopics,
    recentContext: recentAgentContext,
    createdAt: new Date().toISOString()
  };
}

/**
 * Простое извлечение тем (ключевых слов)
 */
function extractTopics(text) {
  // Простой алгоритм: самые частые слова (кроме стоп-слов)
  const stopWords = new Set(['и', 'в', 'на', 'с', 'по', 'для', 'что', 'как', 'это', 'ты', 'я', 'мы', 'он', 'она', 'они', 'а', 'но', 'или', 'если', 'когда', 'где', 'куда', 'от', 'до', 'за', 'под', 'над', 'при', 'про', 'со', 'из', 'к', 'о', 'об', 'ок', 'же', 'ли', 'бы', 'то', 'же']);
  
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));

  const wordFreq = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Восстанавливает контекст из экспортированного диалога
 */
export function restoreConversationFromExport(exportedData) {
  return exportedData.messages;
}

/**
 * Комбинированный метод: создает компакт + summary для экономии контекста
 */
export function createCompactContext(conversationHistory, agentType) {
  const compacted = compactConversation(conversationHistory, {
    keepLastN: 8,
    extractKeyPoints: true
  });

  const summary = createConversationSummary(conversationHistory, agentType);

  return {
    messages: compacted.messages,
    summary,
    stats: {
      originalLength: compacted.originalLength,
      compactedLength: compacted.compactedLength,
      reduction: compacted.reduction,
      reductionPercent: Math.round((compacted.reduction / compacted.originalLength) * 100)
    }
  };
}
