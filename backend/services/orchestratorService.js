import OpenAI from 'openai';
import dotenv from 'dotenv';
import { formatAuthContextForPrompt } from './authContext.js';
import { coverageThreshold, finalizeAnamnesisCoverage } from './anamnesisCoverage.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/** Допустимые фазы пути по методике (Аллен Карр) */
export const PHASES = {
  WELCOME: 'welcome',           // знакомство, раппорт
  ANAMNESIS: 'anamnesis',       // сбор контекста: триггеры, убеждения, страхи
  MYTH_BUSTING: 'myth_busting', // развенчание иллюзий — по одной, без давления
  FREEDOM: 'freedom',           // момент осознания: терять нечего → решение
  SUPPORT: 'support',           // поддержка после решения бросить
};

/** Маппинг фаза → тип агента по умолчанию */
const PHASE_TO_AGENT = {
  [PHASES.WELCOME]: 'anamnesis',
  [PHASES.ANAMNESIS]: 'anamnesis',
  [PHASES.MYTH_BUSTING]: 'myth_buster',
  [PHASES.FREEDOM]: 'myth_buster',
  [PHASES.SUPPORT]: 'support',
};

/**
 * Системный промпт оркестратора: план на 3 шага, проверка "по плану ли диалог", при сбое — новый план.
 * Критично: инструкция агенту должна опираться ТОЛЬКО на то, что пользователь реально сказал. Доверие строится честностью.
 */
const ORCHESTRATOR_SYSTEM = `Ты — оркестратор пути отказа от курения.

Фазы:
- welcome / anamnesis: ИГРА ЛИЛА. Агент anamnesis = Мастер Лилы. Кубик бросает пользователь («🎲 N»). НЕ анкета. НЕ спрашивать сколько курит / сколько лет. Глубина через клетки доски.
- myth_busting: повествование Карра по индивидуальному плану (не диалог).
- support: поддержка после торжественного обещания.

На фазе Лилы instructionToAgent игнорируется — пайплайн сам ведёт игру. Твоя задача: coverageScore, phaseUpdate, sessionBrief, plan.

Переход welcome/anamnesis → myth_busting: coverageScore ≥ порога И достаточно вскрыто через игру.

Формат JSON: plan (3 steps), onTrack, planUpdated, reasonOffTrack, nextAgent, phaseUpdate, instructionToAgent, sessionBrief.`;

/**
 * Нормализовать план: массив ровно из 3 шагов { focus, agent }.
 */
function normalizePlan(parsed) {
  const raw = parsed?.plan?.steps ?? parsed?.steps;
  if (!Array.isArray(raw) || raw.length === 0) {
    return {
      steps: [
        { focus: 'Лила: подтверждение готовности, бросок на вход', agent: 'anamnesis' },
        { focus: 'Лила: разбор клеток через намерение', agent: 'anamnesis' },
        { focus: 'Лила: углубление, переход к мифам', agent: 'anamnesis' },
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
  priorSessionBrief = null,
  authContext = null,
  userInsights = null,
}) {
  const recentMessages = conversationHistory.slice(-12);
  const historyText = recentMessages
    .map((m) => (m.isUser ? 'Пользователь' : 'Зеркало') + ': ' + (m.text || ''))
    .join('\n');

  const isLilaPhase = phase === PHASES.WELCOME || phase === PHASES.ANAMNESIS;

  const isGuest = Boolean(authContext && !authContext.isAuthenticated);

  const guestOrchestratorNote = isGuest
    ? `Пользователь без аккаунта: история в этом браузере; после входа — на сервере. Веди фазы методики как обычно. Напоминания про вход — редко и по делу (клиент и так показывает таймеры).\n\n`
    : '';

  const cov = finalizeAnamnesisCoverage(anamnesisData);
  const thr = coverageThreshold();
  const coverageDigest = isLilaPhase
    ? `=== ИГРА ЛИЛА ===
coverageScore: ${cov.coverageScore} (порог myth_busting: ${thr})
Позиция на доске: ${anamnesisData?.lilaState?.position ?? 0}, вход: ${anamnesisData?.lilaState?.gameEntered ? 'да' : 'нет'}
НЕ инструктируй агента спрашивать сколько курит / сколько лет — это запрещено.

`
    : `=== ПОКРЫТИЕ (таблица Карра) ===
coverageScore: ${cov.coverageScore} (порог: ${thr})
Фрагмент: ${JSON.stringify(cov.carrCoverage ?? {}).slice(0, 4000)}

`;

  const briefNote = priorSessionBrief
    ? `Бриф с прошлой сессии (продолжай отсюда, НЕ начинай знакомство заново): ${priorSessionBrief}\n\n`
    : '';

  const insightEntries = userInsights ? Object.entries(userInsights).filter(([, v]) => v && v.length > 0) : [];
  const insightsNote = insightEntries.length > 0
    ? `ЕГО СОБСТВЕННЫЕ ВЫВОДЫ (он написал это сам — это якоря, которые он уже принял):\n${insightEntries.map(([k, v]) => `  ${k}: "${v}"`).join('\n')}\n\n`
    : '';

  const userPrompt = `${authContext ? formatAuthContextForPrompt(authContext) + '\n\n' : ''}${guestOrchestratorNote}${briefNote}${insightsNote}${coverageDigest}Текущая фаза: ${phase}
Собранный анамнез: ${anamnesisData ? JSON.stringify(anamnesisData, null, 0) : 'пока нет'}
Профиль пользователя: ${userProfile ? JSON.stringify(userProfile, null, 0) : 'нет'}

Текущий план (на следующие 3 шага), если есть:
${currentPlan?.steps ? currentPlan.steps.map((s, i) => `  Шаг ${i + 1}: ${s.focus} (агент: ${s.agent})`).join('\n') : '  (плана нет — составь новый)'}

Последние сообщения:
${historyText || '(диалог только начинается)'}

Последнее сообщение пользователя: ${message}
${isLilaPhase ? '\nФаза Лилы: instructionToAgent не используется пайплайном. Верни краткий sessionBrief и plan по игре.' : ''}
${phase === PHASES.MYTH_BUSTING ? '\nФаза myth_busting: повествование, не диалог.' : ''}

Верни JSON: plan, onTrack, planUpdated, reasonOffTrack, nextAgent, phaseUpdate, instructionToAgent, sessionBrief.`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
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

  let nextAgent = ['anamnesis', 'myth_buster', 'support'].includes(parsed.nextAgent)
    ? parsed.nextAgent
    : PHASE_TO_AGENT[phase] || 'anamnesis';
  let phaseUpdate = Object.values(PHASES).includes(parsed.phaseUpdate)
    ? parsed.phaseUpdate
    : phase;
  let instructionToAgent =
    typeof parsed.instructionToAgent === 'string' && parsed.instructionToAgent.trim()
      ? parsed.instructionToAgent.trim()
      : 'Ответь кратко и по делу, один вопрос или одна мысль.';

  const plan = normalizePlan(parsed);
  const onTrack = Boolean(parsed.onTrack);
  const planUpdated = Boolean(parsed.planUpdated);
  const reasonOffTrack = typeof parsed.reasonOffTrack === 'string' ? parsed.reasonOffTrack.trim() : '';
  const sessionBrief =
    typeof parsed.sessionBrief === 'string' && parsed.sessionBrief.trim()
      ? parsed.sessionBrief.trim()
      : (priorSessionBrief || '');

  return {
    nextAgent,
    phaseUpdate,
    instructionToAgent,
    plan,
    onTrack,
    planUpdated,
    reasonOffTrack,
    sessionBrief,
  };
}
