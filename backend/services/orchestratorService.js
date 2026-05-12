import OpenAI from 'openai';
import dotenv from 'dotenv';
import { formatAuthContextForPrompt } from './authContext.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/** Допустимые фазы пути по методике (Аллен Карр) */
export const PHASES = {
  WELCOME: 'welcome',           // знакомство, раппорт
  ANAMNESIS: 'anamnesis',       // сбор контекста: триггеры, убеждения, страхи
  MYTH_BUSTING: 'myth_busting', // развенчание иллюзий — по одной, без давления
  SUPPORT: 'support',           // поддержка свободы от курения
};

/** Маппинг фаза → тип агента по умолчанию */
const PHASE_TO_AGENT = {
  [PHASES.WELCOME]: 'anamnesis',
  [PHASES.ANAMNESIS]: 'anamnesis',
  [PHASES.MYTH_BUSTING]: 'myth_buster',
  [PHASES.SUPPORT]: 'support',
};

/**
 * Системный промпт оркестратора: план на 3 шага, проверка "по плану ли диалог", при сбое — новый план.
 * Критично: инструкция агенту должна опираться ТОЛЬКО на то, что пользователь реально сказал. Доверие строится честностью.
 */
const ORCHESTRATOR_SYSTEM = `Ты — оркестратор диалога по методике отказа от курения (Аллен Карр + мотивационное интервью).

Цель: помочь человеку прийти к решению и пониманию, что курение — иллюзия. Доверие строится тем, что мы не приписываем человеку то, чего он не говорил, и не раздаём пустые похвалы.

ПРАВИЛА ДЛЯ instructionToAgent (строго):
1) Опирайся ТОЛЬКО на то, что пользователь реально написал. Если он только поздоровался и представился (имя) — НЕ пиши в инструкции "поддержи в решении открыть разговор", "поздравь с первым шагом", "круто, что завёл разговор на эту тему". Он просто назвал имя. Инструкция в таком случае: обратись по имени, кратко поприветствуй в ответ и задай ОДИН естественный следующий вопрос по анамнезу (например: что тебе нравится в курении? или сколько куришь? как давно?). Без пафоса и без приписывания "шагов" или "решений".
2) Рефлексивное слушание: отражай то, что человек сказал; следующий шаг — один вопрос или одна мысль по делу. Пустая мотивационная фраза ("ты молодец", "это первый шаг") без опоры на его слова — разрушает доверие.
3) План на 3 шага — это следующие конкретные шаги по методике (узнать имя → один вопрос про курение → следующий вопрос), а не общие "поддержать" или "сделать комплимент".

Твоя задача:
1) ПЛАНИРОВАТЬ диалог на 3 шага вперёд (план steps: что делать на шаге 1, 2, 3).
2) Проверять: идёт ли разговор по плану; при уходе в сторону — onTrack: false, новый план.
3) instructionToAgent — один фокус на этот ответ, ЗАВЯЗАННЫЙ на последнее сообщение пользователя. Если сообщение = приветствие + имя, фокус = признать имя + один вопрос по теме курения.

Фазы методики (строго по порядку):
- welcome: знакомство, как обращаться. Один вопрос.
- anamnesis: понять человека — что нравится/не нравится, страхи, триггеры, попытки, мотивация. Один вопрос за раз. План = следующие темы по одной.
- myth_busting: трансформация мышления по Карру — не утверждать "это иллюзия", а вести вопросами из опыта пользователя. Если пользователь написал что-то вроде "не верю", "не помогает", "с чего верить", "не убедительно" — в instructionToAgent НЕ писать "приведи факты" или "объясни про иллюзию". Напиши: признать сомнение ("Понимаю"), потом ОДИН вопрос из его же слов (из анамнеза), который подводит к другому взгляду — без требования верить на слово. Цель: чтобы он САМ увидел, как в книге Карра. В остальных случаях myth_busting: один вопрос или аналогия из его опыта + закончить приглашением к ответу.
- support: свобода и поддержка после решения или в процессе отказа. Вопрос или приглашение ("как дела?", "напиши когда трудно").

Формат ответа (строго JSON):
- plan: { "steps": [ { "focus": "...", "agent": "anamnesis"|"myth_buster"|"support" }, ... ] } — 3 элемента.
- onTrack, planUpdated, reasonOffTrack (если нужно).
- nextAgent, phaseUpdate.
- instructionToAgent: 1–3 предложения для агента — ЧТО сделать в этом ответе, с опорой на то, что пользователь написал. Без выдуманных "решений" и "шагов" пользователя.`;

/**
 * Нормализовать план: массив ровно из 3 шагов { focus, agent }.
 */
function normalizePlan(parsed) {
  const raw = parsed?.plan?.steps ?? parsed?.steps;
  if (!Array.isArray(raw) || raw.length === 0) {
    return {
      steps: [
        { focus: 'Установить контакт, один вопрос по методике', agent: 'anamnesis' },
        { focus: 'Следующий шаг по фазе', agent: 'anamnesis' },
        { focus: 'Ещё один шаг к цели', agent: 'anamnesis' },
      ],
    };
  }
  const steps = raw.slice(0, 3).map((s) => ({
    focus: typeof s?.focus === 'string' ? s.focus : String(s?.focus ?? '—'),
    agent: ['anamnesis', 'myth_buster', 'support'].includes(s?.agent) ? s.agent : 'anamnesis',
  }));
  while (steps.length < 3) {
    steps.push({ focus: 'Следующий шаг по методике', agent: steps[steps.length - 1]?.agent ?? 'anamnesis' });
  }
  return { steps };
}

/**
 * Получить решение оркестратора: план на 3 шага, onTrack, решение на текущий ход.
 * @param {Object} params
 * @param {string} params.message — последнее сообщение пользователя
 * @param {Array<{text: string, isUser: boolean}>} params.conversationHistory
 * @param {string} params.phase — текущая фаза
 * @param {Object|null} params.anamnesisData — собранный анамнез
 * @param {Object|null} params.userProfile — профиль пользователя
 * @param {Object|null} params.currentPlan — текущий план { steps: [{ focus, agent }] } (от прошлого ответа)
 * @param {{ isAuthenticated: boolean, userTurnCount?: number, assistantTurnCount?: number }|null} [params.authContext]
 * @returns {Promise<{ nextAgent, phaseUpdate, instructionToAgent, plan, onTrack, planUpdated, reasonOffTrack }>}
 */
export async function getOrchestratorDecision({
  message,
  conversationHistory = [],
  phase = PHASES.WELCOME,
  anamnesisData = null,
  userProfile = null,
  currentPlan = null,
  authContext = null,
}) {
  const recentMessages = conversationHistory.slice(-12);
  const historyText = recentMessages
    .map((m) => (m.isUser ? 'Пользователь' : 'Алекс') + ': ' + (m.text || ''))
    .join('\n');

  const userPrompt = `${authContext ? formatAuthContextForPrompt(authContext) + '\n\n' : ''}Текущая фаза: ${phase}
Собранный анамнез: ${anamnesisData ? JSON.stringify(anamnesisData, null, 0) : 'пока нет'}
Профиль пользователя: ${userProfile ? JSON.stringify(userProfile, null, 0) : 'нет'}

Текущий план (на следующие 3 шага), если есть:
${currentPlan?.steps ? currentPlan.steps.map((s, i) => `  Шаг ${i + 1}: ${s.focus} (агент: ${s.agent})`).join('\n') : '  (плана нет — составь новый)'}

Последние сообщения:
${historyText || '(диалог только начинается)'}

Последнее сообщение пользователя: ${message}

Важно: если пользователь написал только приветствие и/или имя (без рассказа о курении) — в instructionToAgent укажи: обратиться по имени, кратко поприветствовать в ответ, задать один вопрос про курение (что нравится, сколько куришь и т.п.). Не писать "поздравь с первым шагом", "поддержи в решении завести разговор" — он этого не говорил.

Если пользователь выражает недоверие или сомнение (например: "не верю", "не помогает", "с чего верить", "не убедительно", "не убедил") — в instructionToAgent укажи: НЕ подкреплять фактами и НЕ повторять про иллюзию. Признать его чувство ("Понимаю, что так кажется"). Задать ОДИН вопрос из того, что он уже говорил в диалоге (утро, кофе, сон, стресс, насыщение), который подводит к другому взгляду — чтобы он сам увидел, без требования верить боту на слово.
${phase === PHASES.MYTH_BUSTING ? '\nСейчас фаза myth_busting: ответ должен вести вопросами из опыта пользователя, не утверждениями. Закончить приглашением к ответу (вопрос или "хочешь разобрать с другой стороны?").' : ''}

Верни JSON: plan (steps — массив из 3 элементов { "focus", "agent" }), onTrack, planUpdated, reasonOffTrack (если нужно), nextAgent, phaseUpdate, instructionToAgent.`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-5-chat-latest',
    messages: [
      { role: 'system', content: ORCHESTRATOR_SYSTEM },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0].message.content;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.warn('Orchestrator JSON parse fail, using defaults', e);
    parsed = {
      nextAgent: PHASE_TO_AGENT[phase] || 'anamnesis',
      phaseUpdate: phase,
      instructionToAgent: 'Веди диалог в рамках текущей фазы. Один вопрос или одна мысль.',
    };
  }

  const nextAgent = ['anamnesis', 'myth_buster', 'support'].includes(parsed.nextAgent)
    ? parsed.nextAgent
    : PHASE_TO_AGENT[phase] || 'anamnesis';
  const phaseUpdate = Object.values(PHASES).includes(parsed.phaseUpdate)
    ? parsed.phaseUpdate
    : phase;
  const instructionToAgent =
    typeof parsed.instructionToAgent === 'string' && parsed.instructionToAgent.trim()
      ? parsed.instructionToAgent.trim()
      : 'Ответь кратко и по делу, один вопрос или одна мысль.';

  const plan = normalizePlan(parsed);
  const onTrack = Boolean(parsed.onTrack);
  const planUpdated = Boolean(parsed.planUpdated);
  const reasonOffTrack = typeof parsed.reasonOffTrack === 'string' ? parsed.reasonOffTrack.trim() : '';

  return {
    nextAgent,
    phaseUpdate,
    instructionToAgent,
    plan,
    onTrack,
    planUpdated,
    reasonOffTrack,
  };
}
