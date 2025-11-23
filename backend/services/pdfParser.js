import pdfParse from 'pdf-parse';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Парсит PDF файл и извлекает текст
 */
export async function parsePDF(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    
    return {
      text: data.text,
      numPages: data.nfo?.PDF?.Pages || data.numpages || 0,
      info: data.info,
    };
  } catch (error) {
    console.error(`Error parsing PDF ${filePath}:`, error);
    throw error;
  }
}

/**
 * Разбивает текст на чанки для векторного поиска
 * Оптимизировано для больших текстов - обрабатывает по частям
 */
export function chunkText(text, chunkSize = 1000, overlap = 200) {
  if (!text || text.length === 0) {
    return [];
  }
  
  const chunks = [];
  let start = 0;
  const textLength = text.length;
  
  // Для очень больших текстов используем более крупные чанки
  const actualChunkSize = textLength > 1000000 ? 2000 : chunkSize;
  const actualOverlap = textLength > 1000000 ? 400 : overlap;
  
  // Защита от слишком большого overlap
  const safeOverlap = Math.min(actualOverlap, actualChunkSize - 100);
  
  while (start < textLength) {
    const end = Math.min(start + actualChunkSize, textLength);
    const chunk = text.slice(start, end).trim();
    
    if (chunk.length > 0) {
      chunks.push({
        text: chunk,
        start,
        end,
      });
    }
    
    // Переход к следующему чанку с перекрытием
    const nextStart = end - safeOverlap;
    
    // Защита от бесконечного цикла или отрицательных значений
    if (nextStart <= start) {
      start = end; // Переходим к следующему чанку без перекрытия
    } else {
      start = Math.max(0, nextStart); // Убеждаемся, что start не отрицательный
    }
    
    // Дополнительная защита от бесконечного цикла
    if (start >= textLength) {
      break;
    }
  }
  
  return chunks;
}

/**
 * Получает список всех PDF файлов в корне проекта
 */
export async function getPDFFiles() {
  const projectRoot = path.resolve(__dirname, '../..');
  const files = await fs.readdir(projectRoot);
  
  return files
    .filter(file => file.endsWith('.pdf'))
    .map(file => path.join(projectRoot, file));
}

/**
 * Обрабатывает все PDF файлы и создает чанки
 * Оптимизировано для больших файлов - обрабатывает по одному и освобождает память
 */
export async function processAllPDFs() {
  const pdfFiles = await getPDFFiles();
  const allChunks = [];
  
  console.log(`Найдено ${pdfFiles.length} PDF файлов`);
  
  for (let i = 0; i < pdfFiles.length; i++) {
    const filePath = pdfFiles[i];
    const fileName = path.basename(filePath);
    console.log(`\n[${i + 1}/${pdfFiles.length}] Обработка: ${fileName}`);
    
    try {
      // Парсим PDF
      console.log(`  Чтение PDF...`);
      const { text, numPages } = await parsePDF(filePath);
      console.log(`  Извлечено ${text.length} символов из ${numPages} страниц`);
      
      // Разбиваем на чанки
      console.log(`  Разбиение на чанки...`);
      const chunks = chunkText(text);
      
      // Добавляем чанки
      chunks.forEach((chunk, index) => {
        allChunks.push({
          id: `${fileName}_${index}`,
          source: fileName,
          text: chunk.text,
          chunkIndex: index,
        });
      });
      
      console.log(`  ✅ Создано ${chunks.length} чанков из ${fileName}`);
      
      // Освобождаем память (удаляем ссылку на большой текст)
      // В JavaScript это не гарантирует немедленное освобождение,
      // но помогает сборщику мусора
      
    } catch (error) {
      console.error(`  ❌ Ошибка при обработке ${fileName}:`, error.message);
      if (error.message.includes('memory') || error.message.includes('heap')) {
        console.error(`  ⚠️  Файл слишком большой. Попробуйте увеличить лимит памяти: node --max-old-space-size=8192`);
      }
    }
    
    // Принудительная сборка мусора между файлами (если доступна)
    if (global.gc && i < pdfFiles.length - 1) {
      global.gc();
    }
  }
  
  console.log(`\n✅ Всего создано ${allChunks.length} чанков из ${pdfFiles.length} файлов`);
  return allChunks;
}

