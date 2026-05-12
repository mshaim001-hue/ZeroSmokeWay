import { getUserIdFromAuthHeader } from '../lib/supabaseServer.js';

/** После стольких сообщений пользователя в гостевом режиме — мягко напоминать про вход */
export const GUEST_NUDGE_AFTER_USER_MESSAGES = 2;

/** После стольких — настаивать сильнее (без агрессии), всё ещё ведя короткий диалог */
export const GUEST_STRONG_NUDGE_AFTER_USER_MESSAGES = 5;

/**
 * @param {string | undefined} authorizationHeader
 * @param {Array<{ isUser: boolean }>} conversationHistory
 * @returns {Promise<{ userId: string | null, isAuthenticated: boolean, userTurnCount: number, assistantTurnCount: number }>}
 */
export async function resolveAuthContext(authorizationHeader, conversationHistory = []) {
  const userId = await getUserIdFromAuthHeader(authorizationHeader);
  const isAuthenticated = Boolean(userId);
  const userTurnCount = conversationHistory.filter((m) => m.isUser).length;
  const assistantTurnCount = conversationHistory.filter((m) => !m.isUser).length;
  return { userId, isAuthenticated, userTurnCount, assistantTurnCount };
}

/**
 * Текст для system / user блока — видят оркестратор и все агенты.
 * @param {Awaited<ReturnType<typeof resolveAuthContext>>} ctx
 */
export function formatAuthContextForPrompt(ctx) {
  const { isAuthenticated, userTurnCount, assistantTurnCount } = ctx;
  const lines = [
    '=== СОСТОЯНИЕ АККАУНТА (используй при ответе; не выдумывай, что человек уже вошёл, если написано «гость») ===',
    isAuthenticated
      ? '- Пользователь авторизован: прогресс и история на сервере привязаны к аккаунту, можно возобновлять между заходами.'
      : '- Пользователь НЕ авторизован (гость): без входа история и анамнез в основном только в этом браузере; при смене устройства или очистке данные не сохраняются.',
    `- В этой сессии уже сообщений от пользователя: ${userTurnCount}; ответов бота до этого шага: ${assistantTurnCount}.`,
  ];
  return lines.join('\n');
}

/**
 * Доп. правила для агента анамнеза (гость / залогинен).
 */
export function formatAnamnesisAuthRules(ctx) {
  if (ctx.isAuthenticated) {
    return [
      '',
      '=== АНАМНЕЗ: авторизованный пользователь ===',
      '- Собирай анамнез спокойно, по одному вопросу. Напоминание про вход не нужно (человек уже в аккаунте).',
    ].join('\n');
  }

  const { userTurnCount } = ctx;
  const soft = userTurnCount >= GUEST_NUDGE_AFTER_USER_MESSAGES;
  const strong = userTurnCount >= GUEST_STRONG_NUDGE_AFTER_USER_MESSAGES;

  return [
    '',
    '=== АНАМНЕЗ: гость (нет входа) ===',
    '- Можешь вести короткий живой сбор контекста, но не растягивай глубокий анамнез, пока человек не создаст аккаунт / не войдёт.',
    `- Уже ${userTurnCount} сообщений от пользователя в этой сессии.`,
    soft
      ? '- Обязательно мягко объясни: чтобы не потерять историю диалога и прогресс при следующих заходах, лучше зарегистрироваться / войти (формулировка своими словами, без давления).'
      : '- Если уместно, одним коротким предложением намекни, что вход поможет сохранить разговор.',
    strong
      ? '- Сейчас вежливо настаивай: без аккаунта прогресс не гарантирован; предложи войти и только после этого продолжить подробный анамнез. Всё равно задай не больше одного уточняющего вопроса в конце, если это уместно.'
      : '- Не морализируй; тон спокойный и уважительный.',
  ].join('\n');
}

/**
 * Короткие правила для myth_buster и support.
 */
export function formatSecondaryAgentAuthRules(agentType, ctx) {
  if (ctx.isAuthenticated) {
    return '';
  }
  const tag =
    agentType === 'myth_buster'
      ? 'Для гостя: если к месту — одним предложением напомни, что вход сохранит историю; не блокируй ответ на сомнения.'
      : 'Для гостя: если уместно, мягко напомни про вход, чтобы не потерять поддержку между заходами.';
  return `\n=== ${agentType} / гость ===\n${tag}\n`;
}
