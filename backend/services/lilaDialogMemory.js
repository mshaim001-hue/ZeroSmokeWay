import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const LILA_RECENT_PAIR_LIMIT = 15;
export const LILA_SUMMARY_CHUNK_PAIRS = 5;

const SUMMARY_SYSTEM = `Ты сжимаешь фрагмент игры Лила для памяти Мастера Лилы.
Сохрани: посещённые клетки, важные цитаты и эпизоды человека, обнаруженные связи, что уже разобрано и что ещё открыто.
Отдельно сохрани поправки человека и отвергнутые гипотезы: что предполагал ведущий, почему это не подошло. Не возвращай отвергнутое как факт.
Отличай слова человека от предположений ведущего. Не превращай интерпретации в установленные причины.
Не дублируй таблицу carrCoverage — только нарратив, смысловые повороты и формулировки человека.
Пиши на русском, компактно: до 20 пунктов или 15–20 предложений.`;

/**
 * @param {Array<{ isUser: boolean }>} history
 */
export function countDialogPairs(history) {
  if (!Array.isArray(history) || history.length === 0) return 0;

  let i = 0;
  while (i < history.length && !history[i].isUser) i += 1;

  let pairs = 0;
  while (i + 1 < history.length) {
    if (history[i].isUser && !history[i + 1].isUser) {
      pairs += 1;
      i += 2;
    } else {
      i += 1;
    }
  }
  return pairs;
}

/**
 * @param {Array<{ text: string, isUser: boolean, timestamp?: string }>} history
 * @param {number} pairLimit
 */
export function extractRecentPairMessages(history, pairLimit = LILA_RECENT_PAIR_LIMIT) {
  if (!Array.isArray(history) || history.length === 0 || pairLimit <= 0) return [];

  const pairs = [];
  let i = history.length - 1;

  while (i >= 0 && pairs.length < pairLimit) {
    if (!history[i].isUser) {
      if (i > 0 && history[i - 1].isUser) {
        pairs.unshift([history[i - 1], history[i]]);
        i -= 2;
      } else {
        i -= 1;
      }
    } else {
      i -= 1;
    }
  }

  return pairs.flat();
}

/**
 * @param {Array<{ text: string, isUser: boolean }>} history
 * @param {number} startPair index пары (0-based)
 * @param {number} pairCount
 */
export function extractPairRangeMessages(history, startPair, pairCount) {
  if (pairCount <= 0) return [];

  let i = 0;
  while (i < history.length && !history[i].isUser) i += 1;

  let pairIndex = 0;
  const out = [];

  while (i + 1 < history.length && pairIndex < startPair + pairCount) {
    if (history[i].isUser && !history[i + 1].isUser) {
      if (pairIndex >= startPair) {
        out.push(history[i], history[i + 1]);
      }
      pairIndex += 1;
      i += 2;
    } else {
      i += 1;
    }
  }

  return out;
}

/**
 * @param {object|null|undefined} anamnesisData
 */
export function normalizeLilaDialogMemory(anamnesisData) {
  const raw = anamnesisData && typeof anamnesisData === 'object' ? anamnesisData : {};
  const summary =
    typeof raw.lilaDialogSummary === 'string' && raw.lilaDialogSummary.trim()
      ? raw.lilaDialogSummary.trim()
      : '';
  const summarizedPairCount = Number.isFinite(raw.lilaSummarizedPairCount)
    ? Math.max(0, Math.floor(raw.lilaSummarizedPairCount))
    : 0;

  return { summary, summarizedPairCount };
}

function formatTranscript(messages) {
  return messages
    .map((m) => `${m.isUser ? 'Человек' : 'Зеркало'}: ${String(m.text || '').trim()}`)
    .join('\n');
}

/**
 * @param {{ previousSummary: string, chunkMessages: Array, visitedCells?: number[] }} params
 */
async function mergeLilaDialogSummary({ previousSummary, chunkMessages, visitedCells = [] }) {
  const transcript = formatTranscript(chunkMessages);
  if (!transcript.trim()) return previousSummary;

  const visited =
    Array.isArray(visitedCells) && visitedCells.length > 0
      ? `\nУже посещённые клетки (для контекста): ${visitedCells.join(', ')}`
      : '';

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
    messages: [
      { role: 'system', content: SUMMARY_SYSTEM },
      {
        role: 'user',
        content:
          (previousSummary
            ? `Текущее резюме:\n${previousSummary}\n\n`
            : 'Текущего резюме нет — создай первое.\n\n') +
          `Новый фрагмент диалога (добавь к резюме, не дублируй):\n${transcript}${visited}`,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim();
  return text || previousSummary;
}

/**
 * Готовит окно для Лилы: резюме архива + последние 15 пар.
 * При необходимости обновляет резюме чанками по 5 пар.
 *
 * @param {{ conversationHistory: Array, anamnesisData?: object|null, visitedCells?: number[] }} params
 */
export async function prepareLilaDialogContext({
  conversationHistory = [],
  anamnesisData = null,
  visitedCells = [],
}) {
  const history = Array.isArray(conversationHistory) ? conversationHistory : [];
  const memory = normalizeLilaDialogMemory(anamnesisData);
  const totalPairs = countDialogPairs(history);
  const archivedPairs = Math.max(0, totalPairs - LILA_RECENT_PAIR_LIMIT);
  const recentMessages = extractRecentPairMessages(history, LILA_RECENT_PAIR_LIMIT);

  let summary = memory.summary;
  let summarizedPairCount = memory.summarizedPairCount;

  while (summarizedPairCount < archivedPairs) {
    const chunkSize = Math.min(LILA_SUMMARY_CHUNK_PAIRS, archivedPairs - summarizedPairCount);
    const chunkMessages = extractPairRangeMessages(history, summarizedPairCount, chunkSize);
    summary = await mergeLilaDialogSummary({
      previousSummary: summary,
      chunkMessages,
      visitedCells,
    });
    summarizedPairCount += chunkSize;
  }

  return {
    recentMessages,
    dialogSummary: summary,
    lilaDialogMemory: {
      lilaDialogSummary: summary,
      lilaSummarizedPairCount: summarizedPairCount,
    },
    stats: {
      totalPairs,
      archivedPairs,
      recentPairCount: countDialogPairs(recentMessages),
    },
  };
}
