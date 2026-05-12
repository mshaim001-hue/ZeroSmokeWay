import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { processAllPDFs } from './pdfParser.js';
import { hasSupabaseAdmin } from '../lib/supabaseServer.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KNOWLEDGE_BASE_DIR = path.join(__dirname, '../../knowledge-base');
const EMBEDDINGS_FILE = path.join(KNOWLEDGE_BASE_DIR, 'embeddings.json');

/**
 * Создает embeddings для текста
 */
export async function createEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    throw error;
  }
}

/**
 * Создает embeddings для всех чанков (обрабатывает батчами для экономии памяти)
 */
export async function createEmbeddingsForChunks(chunks) {
  console.log(`Создание embeddings для ${chunks.length} чанков...`);
  
  const chunksWithEmbeddings = [];
  const BATCH_SIZE = 50; // Обрабатываем по 50 чанков за раз
  
  for (let batchStart = 0; batchStart < chunks.length; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, chunks.length);
    const batch = chunks.slice(batchStart, batchEnd);
    
    console.log(`  Обработка батча ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} (чанки ${batchStart + 1}-${batchEnd})`);
    
    for (let i = 0; i < batch.length; i++) {
      const chunk = batch[i];
      const globalIndex = batchStart + i;
      
      try {
        const embedding = await createEmbedding(chunk.text);
        chunksWithEmbeddings.push({
          ...chunk,
          embedding,
        });
        
        // Небольшая задержка чтобы не превысить rate limits
        if (globalIndex < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`  Ошибка при создании embedding для ${chunk.id}:`, error.message);
      }
    }
    
    // Принудительная сборка мусора между батчами (если доступна)
    if (global.gc) {
      global.gc();
    }
  }
  
  return chunksWithEmbeddings;
}

/**
 * Классифицирует чанк по типу агента на основе содержания
 * Возвращает массив типов агентов, к которым относится чанк (может быть несколько)
 */
async function classifyChunkForAgents(chunkText) {
  // Ключевые слова и фразы для каждого типа агента
  const agentKeywords = {
    anamnesis: [
      'вопрос', 'спросить', 'узнать', 'выяснить', 'информация о', 'расскажи', 'как давно',
      'сколько', 'почему куришь', 'причина', 'мотивация', 'страх', 'триггер', 'ситуация',
      'история', 'попытка', 'пытался', 'бросал', 'зависимость', 'привычка', 'стаж курения',
      'сигарет в день', 'когда куришь', 'где куришь', 'с кем куришь', 'что чувствуешь',
      'анамнез', 'сбор информации', 'опрос', 'выявление', 'понимание'
    ],
    myth_buster: [
      'миф', 'заблуждение', 'иллюзия', 'ложь', 'неправда', 'развенчать', 'разрушить',
      'убеждение', 'крючок', 'никотиновый зуд', 'удовольствие', 'расслабление', 'концентрация',
      'стресс', 'сила воли', 'жертва', 'отказ', 'заменитель', 'вейп', 'пластырь', 'кальян',
      'одна сигарета', 'локомотив', 'врожденная зависимость', 'ничего не теряю',
      'правильный настрой', 'аллен карр', 'карр', 'правда о', 'реальность', 'факт',
      'не помогает', 'не снимает', 'не расслабляет', 'обман', 'самообман'
    ],
    support: [
      'поддержка', 'помощь', 'свобода', 'некурящий', 'бросить', 'отказ', 'последняя сигарета',
      'день Ч', 'подготовка', 'решение', 'дата', 'время', 'настрой', 'радость', 'гордость',
      'якорь', 'триггер', 'тяга', 'желание', 'антисрыв', 'пауза', '10 минут', 'техника',
      'метод', 'способ', 'поддержание', 'свобода от курения', 'не курю', 'некурящий',
      'проснулся некурящим', 'выбросить сигареты', 'символический акт', 'переход',
      'этап поддержания', 'долгосрочная перспектива', 'наслаждаться жизнью', 'победа',
      'достижение', 'мотивация', 'вдохновение', 'успех'
    ]
  };

  const chunkLower = chunkText.toLowerCase();
  const agentScores = {
    anamnesis: 0,
    myth_buster: 0,
    support: 0
  };

  // Подсчитываем совпадения ключевых слов
  for (const [agentType, keywords] of Object.entries(agentKeywords)) {
    for (const keyword of keywords) {
      if (chunkLower.includes(keyword.toLowerCase())) {
        agentScores[agentType]++;
      }
    }
  }

  // Определяем, к каким агентам относится чанк
  // Чанк может относиться к нескольким агентам
  const maxScore = Math.max(...Object.values(agentScores));
  const relevantAgents = [];

  // Если есть явные совпадения, добавляем агентов
  for (const [agentType, score] of Object.entries(agentScores)) {
    // Порог: минимум 2 совпадения или если это максимальный score
    if (score >= 2 || (score > 0 && score === maxScore && maxScore >= 1)) {
      relevantAgents.push(agentType);
    }
  }

  // Если нет явных совпадений, используем OpenAI для классификации
  if (relevantAgents.length === 0 && chunkText.length > 100) {
    try {
      const classification = await classifyChunkWithAI(chunkText);
      return classification;
    } catch (error) {
      console.warn(`  ⚠️  Ошибка AI классификации, используем общий тип: ${error.message}`);
      // Если AI классификация не удалась, относим к support (универсальный)
      return ['support'];
    }
  }

  // Если все еще нет совпадений, относим к support (универсальный тип)
  if (relevantAgents.length === 0) {
    return ['support'];
  }

  return relevantAgents;
}

/**
 * Классифицирует чанк с помощью OpenAI
 */
async function classifyChunkWithAI(chunkText) {
  const prompt = `Проанализируй следующий фрагмент текста о курении и определи, к какому типу агента он относится:

Типы агентов:
1. "anamnesis" - сбор информации, вопросы, выявление причин курения, страхов, триггеров
2. "myth_buster" - развенчание мифов, разрушение убеждений о курении, объяснение правды
3. "support" - поддержка, мотивация, техники отказа, поддержание свободы от курения

Фрагмент текста:
${chunkText.substring(0, 500)}...

Верни JSON объект с полем "agents" содержащим массив типов агентов, к которым относится этот фрагмент (может быть несколько):
{"agents": ["agent_type1", "agent_type2"]}`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.4-nano',
      messages: [
        { role: 'system', content: 'Ты помощник для классификации текстов. Отвечай только валидным JSON объектом с полем "agents" содержащим массив строк.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content);
    const agents = result.agents || result.types || [];
    
    // Валидация - убеждаемся что это массив
    const agentsArray = Array.isArray(agents) ? agents : [];
    const validAgents = ['anamnesis', 'myth_buster', 'support'];
    const filtered = agentsArray.filter(agent => validAgents.includes(agent));
    
    return filtered.length > 0 ? filtered : ['support'];
  } catch (error) {
    console.warn(`  ⚠️  Ошибка AI классификации: ${error.message}`);
    return ['support']; // Fallback
  }
}

/**
 * Вычисляет косинусное сходство между двумя векторами
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Ищет релевантные фрагменты в базе знаний
 * @param {string} query - Поисковый запрос
 * @param {number} topK - Количество результатов
 * @param {string} agentType - Тип агента для фильтрации (опционально): 'anamnesis', 'myth_buster', 'support'
 */
export async function searchKnowledgeBase(query, topK = 5, agentType = null) {
  try {
    if (hasSupabaseAdmin()) {
      const { searchKnowledgeFromSupabase } = await import('./knowledgeSupabase.js');
      const fromDb = await searchKnowledgeFromSupabase(query, topK, agentType);
      if (fromDb.length > 0) {
        console.log(`✅ KB (Supabase): ${fromDb.length} фрагментов`);
        return fromDb;
      }
    }

    // Загружаем embeddings если есть локальный файл (fallback)
    if (!(await fs.pathExists(EMBEDDINGS_FILE))) {
      console.log('⚠️  База знаний не индексирована. Запустите: npm run index-knowledge');
      return [];
    }
    
    const embeddingsData = await fs.readJson(EMBEDDINGS_FILE);
    let chunks = embeddingsData.chunks || [];
    
    if (chunks.length === 0) {
      console.log('⚠️  База знаний пуста');
      return [];
    }
    
    // Фильтруем по типу агента, если указан
    if (agentType) {
      chunks = chunks.filter(chunk => {
        const agents = chunk.agentTypes || [];
        return agents.includes(agentType);
      });
      console.log(`🔍 Поиск для агента "${agentType}": "${query}" (${chunks.length} релевантных чанков из ${embeddingsData.chunks.length})`);
    } else {
      console.log(`🔍 Поиск в базе знаний: "${query}" (${chunks.length} чанков)`);
    }
    
    if (chunks.length === 0) {
      console.log('⚠️  Нет чанков для указанного типа агента');
      return [];
    }
    
    // Создаем embedding для запроса
    const queryEmbedding = await createEmbedding(query);
    
    // Вычисляем сходство для каждого чанка
    const similarities = chunks.map(chunk => ({
      ...chunk,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));
    
    // Сортируем по сходству и берем топ-K
    const topChunks = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .filter(item => item.similarity > 0.3); // Минимальный порог релевантности
    
    console.log(`✅ Найдено ${topChunks.length} релевантных фрагментов`);
    
    return topChunks.map(({ text, source, similarity, agentTypes }) => ({
      text,
      source,
      similarity: Math.round(similarity * 100) / 100, // Округляем до 2 знаков
      agentTypes: agentTypes || [], // Добавляем информацию о типах агентов
    }));
  } catch (error) {
    console.error('❌ Ошибка при поиске в базе знаний:', error);
    return [];
  }
}

/**
 * Индексирует все PDF файлы и создает базу знаний
 * Оптимизировано для работы с большими файлами
 */
export async function indexKnowledgeBase() {
  console.log('Начало индексации базы знаний...');
  
  // Создаем директорию для базы знаний
  await fs.ensureDir(KNOWLEDGE_BASE_DIR);
  
  // Обрабатываем все PDF
  console.log('\n📖 Этап 1: Парсинг PDF файлов...');
  const chunks = await processAllPDFs();
  
  if (chunks.length === 0) {
    console.log('Не найдено чанков для индексации');
    return;
  }
  
  console.log(`\n🏷️  Этап 2: Классификация чанков по типам агентов...`);
  console.log(`   Классифицирую ${chunks.length} чанков...`);
  
  // Классифицируем чанки по агентам
  const chunksWithAgents = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (i % 100 === 0) {
      console.log(`   Обработано ${i}/${chunks.length} чанков...`);
    }
    
    try {
      const agentTypes = await classifyChunkForAgents(chunk.text);
      chunksWithAgents.push({
        ...chunk,
        agentTypes: agentTypes.length > 0 ? agentTypes : ['support'], // По умолчанию support
      });
    } catch (error) {
      console.warn(`   ⚠️  Ошибка классификации чанка ${chunk.id}: ${error.message}`);
      chunksWithAgents.push({
        ...chunk,
        agentTypes: ['support'], // Fallback
      });
    }
  }
  
  // Статистика по агентам
  const agentStats = {
    anamnesis: 0,
    myth_buster: 0,
    support: 0,
    multiple: 0
  };
  
  chunksWithAgents.forEach(chunk => {
    if (chunk.agentTypes.length > 1) {
      agentStats.multiple++;
    }
    chunk.agentTypes.forEach(agent => {
      if (agentStats.hasOwnProperty(agent)) {
        agentStats[agent]++;
      }
    });
  });
  
  console.log(`\n📊 Статистика классификации:`);
  console.log(`   anamnesis: ${agentStats.anamnesis} чанков`);
  console.log(`   myth_buster: ${agentStats.myth_buster} чанков`);
  console.log(`   support: ${agentStats.support} чанков`);
  console.log(`   multiple (несколько типов): ${agentStats.multiple} чанков`);
  
  console.log(`\n📊 Этап 3: Создание embeddings для ${chunksWithAgents.length} чанков...`);
  console.log('Это может занять время и стоить денег (~$0.02-0.10 для 4 книг)');
  
  // Создаем embeddings батчами
  const chunksWithEmbeddings = await createEmbeddingsForChunks(chunksWithAgents);
  
  console.log(`\n💾 Этап 4: Сохранение embeddings...`);
  
  // Сохраняем embeddings по частям для экономии памяти
  const embeddingsData = {
    chunks: chunksWithEmbeddings.map(({ embedding, ...rest }) => ({
      ...rest,
      embedding, // Сохраняем embedding
    })),
    indexedAt: new Date().toISOString(),
    totalChunks: chunksWithEmbeddings.length,
  };
  
  await fs.writeJson(EMBEDDINGS_FILE, embeddingsData, { spaces: 2 });
  
  console.log(`\n✅ База знаний проиндексирована!`);
  console.log(`   Всего чанков: ${chunksWithEmbeddings.length}`);
  console.log(`   Сохранено в: ${EMBEDDINGS_FILE}`);
  
  return embeddingsData;
}

