import { getUserIdFromAuthHeader } from '../lib/supabaseServer.js';

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

  return [
    '',
    '=== АНАМНЕЗ: гость ===',
    '- Для гостя ответы формирует сервер (сценарий до входа); этот блок к LLM по анамнезу не попадает.',
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
