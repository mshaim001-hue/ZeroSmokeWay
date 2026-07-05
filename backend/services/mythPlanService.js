import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MYTH_PLAN_SYSTEM = `Ты — методолог Аллена Карра. Тебе передали полную переписку игры Лила и структурированные данные о курильщике.

Твоя задача — составить ИНДИВИДУАЛЬНЫЙ ПЛАН РАЗВЕНЧАНИЯ МИФОВ для этого конкретного человека. Это не диалог и не список вопросов — это повествование, которое потом будет зачитано человеку целиком по частям.

План должен:
1. Опираться ТОЛЬКО на то, что человек реально сказал в Лиле — его слова, ситуации, страхи.
2. Объяснить ПОЧЕМУ он до сих пор курит — связно, как историю, без допроса.
3. Разобрать каждый его миф/иллюзию (стресс, кофе, компания, скука, концентрация, страх последней сигареты и т.д.) — только те, что подтверждены его словами.
4. Использовать логику Карра: никотин создаёт дискомфорт → сигарета снимает его → иллюзия «помогает»; «тугие туфли».
5. Закончиться подготовкой к торжественному обещанию бросить — без давления, но ясно: терять нечего.

Стиль: спокойное повествование, уверенность, без морали и без «ты молодец». Как умный друг, который всё расставил по полочкам.

Формат ответа (JSON):
{
  "title": "краткое название пути этого человека",
  "sections": [
    { "title": "заголовок части", "content": "текст повествования 3–8 абзацев" }
  ],
  "pledgePrompt": "текст приглашения дать торжественное обещание бросить — персонализированный"
}

sections: 3–5 частей. Каждая content — готовый текст для зачитывания, без вопросов в конце.`;

/**
 * Генерирует индивидуальный план развенчания мифов — «RAG» для агента Карра.
 * @param {{ conversationHistory: Array, carrCoverage: object }} params
 */
export async function generateMythPlan({ conversationHistory = [], carrCoverage = {} }) {
  const transcript = conversationHistory
    .map((m) => (m.isUser ? 'Человек' : 'Зеркало') + ': ' + (m.text || ''))
    .join('\n');

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
    messages: [
      { role: 'system', content: MYTH_PLAN_SYSTEM },
      {
        role: 'user',
        content:
          `Переписка Лилы:\n${transcript.slice(0, 120000)}\n\n` +
          `Структурированные данные (carrCoverage):\n${JSON.stringify(carrCoverage, null, 2)}`,
      },
    ],
    response_format: { type: 'json_object' },
  });

  let parsed;
  try {
    parsed = JSON.parse(completion.choices[0].message.content);
  } catch {
    throw new Error('Не удалось составить план развенчания мифов');
  }

  const sections = Array.isArray(parsed.sections)
    ? parsed.sections
        .filter((s) => s && typeof s.content === 'string' && s.content.trim())
        .map((s) => ({
          title: typeof s.title === 'string' ? s.title.trim() : 'Часть',
          content: s.content.trim(),
        }))
    : [];

  if (sections.length === 0) {
    throw new Error('План развенчания мифов пуст');
  }

  return {
    title: typeof parsed.title === 'string' ? parsed.title.trim() : 'Твой путь',
    sections,
    pledgePrompt:
      typeof parsed.pledgePrompt === 'string' && parsed.pledgePrompt.trim()
        ? parsed.pledgePrompt.trim()
        : 'Теперь, когда всё на своих местах — дай торжественное обещание себе: бросить курить. Напиши его своими словами.',
    generatedAt: new Date().toISOString(),
  };
}

/** @param {object|null} mythPlan */
export function normalizeMythPlan(mythPlan) {
  if (!mythPlan || typeof mythPlan !== 'object') return null;
  const sections = Array.isArray(mythPlan.sections)
    ? mythPlan.sections.filter((s) => s?.content?.trim())
    : [];
  if (sections.length === 0) return null;
  return {
    title: mythPlan.title || 'Твой путь',
    sections,
    pledgePrompt: mythPlan.pledgePrompt || '',
    generatedAt: mythPlan.generatedAt || null,
  };
}

/** @param {object} mythProgress */
export function normalizeMythProgress(mythProgress) {
  const mp = mythProgress && typeof mythProgress === 'object' ? mythProgress : {};
  return {
    sectionIndex: Number.isFinite(Number(mp.sectionIndex)) ? Math.max(0, Number(mp.sectionIndex)) : 0,
    narrativeComplete: Boolean(mp.narrativeComplete),
    pledgeReceived: Boolean(mp.pledgeReceived),
  };
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function looksLikePledge(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.toLowerCase().trim();
  if (t.length < 12) return false;
  const signals = [
    'обещаю',
    'клянусь',
    'торжественно',
    'бросаю',
    'больше не буду',
    'перестаю курить',
    'не буду курить',
    'заканчиваю',
    'моё решение',
    'мое решение',
    'я решил',
    'я решила',
  ];
  return signals.some((s) => t.includes(s));
}
