import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { processAllPDFs } from './pdfParser.js';

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
 */
export async function searchKnowledgeBase(query, topK = 5) {
  try {
    // Загружаем embeddings если они есть
    if (!(await fs.pathExists(EMBEDDINGS_FILE))) {
      console.log('⚠️  База знаний не индексирована. Запустите: npm run index-knowledge');
      return [];
    }
    
    const embeddingsData = await fs.readJson(EMBEDDINGS_FILE);
    const chunks = embeddingsData.chunks || [];
    
    if (chunks.length === 0) {
      console.log('⚠️  База знаний пуста');
      return [];
    }
    
    console.log(`🔍 Поиск в базе знаний: "${query}" (${chunks.length} чанков)`);
    
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
      .filter(item => item.similarity > 0.3); // Минимальный порог релевантности (снижен для лучшего покрытия)
    
    console.log(`✅ Найдено ${topChunks.length} релевантных фрагментов`);
    
    return topChunks.map(({ text, source, similarity }) => ({
      text,
      source,
      similarity: Math.round(similarity * 100) / 100, // Округляем до 2 знаков
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
  
  console.log(`\n📊 Этап 2: Создание embeddings для ${chunks.length} чанков...`);
  console.log('Это может занять время и стоить денег (~$0.02-0.10 для 4 книг)');
  
  // Создаем embeddings батчами
  const chunksWithEmbeddings = await createEmbeddingsForChunks(chunks);
  
  console.log(`\n💾 Этап 3: Сохранение embeddings...`);
  
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

