/**
 * Жёсткий сценарий анамнеза для гостя: имя (после приветствия в UI) → что делаем → вход.
 * Пока нет JWT — не вызываем LLM по анамнезу (ответы не сохраняются на сервере).
 */

/**
 * @param {string} text
 * @returns {string|null}
 */
function guessCallName(text) {
  if (!text) return null;
  const t = text.trim();
  const m1 = t.match(/меня зовут\s+([^,.;\n]+)/i);
  if (m1) return m1[1].trim().slice(0, 48);
  const m2 = t.match(/это\s+([А-Яа-яЁёA-Za-z\-]+)/i);
  if (m2 && t.length < 40) return m2[1].trim().slice(0, 48);
  if (t.length <= 28 && /^[\p{L}\s\-]+$/u.test(t) && t.split(/\s+/).length <= 3) {
    return t.slice(0, 48);
  }
  return null;
}

/**
 * @param {Array<{ text?: string, isUser?: boolean }>} conversationHistory
 * @returns {string[]}
 */
function userLines(history) {
  return history.filter((m) => m.isUser).map((m) => (m.text || '').trim()).filter(Boolean);
}

/**
 * @param {string[]} users
 * @returns {string|null}
 */
function pickDisplayName(users) {
  const a = guessCallName(users[1]) || guessCallName(users[0]);
  if (a) return a;
  if (users[1]) {
    const w = users[1].split(/\s+/)[0];
    if (w && w.length <= 24) return w;
  }
  if (users[0]) {
    const w = users[0].split(/\s+/)[0];
    if (w && w.length <= 24) return w;
  }
  return null;
}

/**
 * @param {{ conversationHistory: Array<{ text?: string, isUser?: boolean }>, userTurnCount: number }} p
 * @returns {{ response: string, extractedProfile: object, extractedData: object, currentStep: number, isComplete: boolean, contextCompacted: boolean, contextStats: null }}
 */
export function buildGuestAnamnesisGateResult({ conversationHistory, userTurnCount }) {
  const uc = userTurnCount;
  const users = userLines(conversationHistory);

  if (uc === 1) {
    const guess = users[0] ? guessCallName(users[0]) : null;
    const response = guess
      ? `Спасибо, что написали.\n\nУдобно, если я буду обращаться «${guess}»? Если нужно иначе — напишите, как вам комфортнее.`
      : `Спасибо, что написали.\n\nКак вам удобнее, чтобы я обращался по имени?`;
    return {
      response,
      extractedProfile: guess ? { name: guess } : {},
      extractedData: {},
      currentStep: 1,
      isComplete: false,
      contextCompacted: false,
      contextStats: null,
    };
  }

  if (uc === 2) {
    const name = pickDisplayName(users);
    const greeting = name ? `Спасибо, ${name}.` : 'Спасибо за ответ.';
    const response = `${greeting}\n\nДальше мы спокойно разберём вашу историю с сигаретами: что даёт курение, что раздражает, чего вы боитесь без сигареты — по одному короткому вопросу за раз. Так я смогу поддерживать вас по делу, а не общими фразами, и помочь сориентироваться, если вы решите бросить.\n\nЧтобы сохранять этот разговор на сервере и потом вести дневник прогресса (в том числе отчёт с даты, когда вы бросите или уже бросили), понадобится аккаунт — об этом на следующем шаге.`;
    const profName = guessCallName(users[1]) || guessCallName(users[0]);
    return {
      response,
      extractedProfile: profName ? { name: profName } : {},
      extractedData: {},
      currentStep: 2,
      isComplete: false,
      contextCompacted: false,
      contextStats: null,
    };
  }

  if (uc === 3) {
    return {
      response:
        'Чтобы я мог сохранять наш диалог между заходами с любого устройства, не терять то, что вы расскажете, и вести учёт прогресса (включая дни без сигарет с момента, когда вы бросите или уже бросили), нужен вход в аккаунт.\n\nПожалуйста, нажмите вверху кнопку «Войти»: можно через Google или почту с паролем. Пока вы не войдёте, я не продолжу сбор анамнеза — иначе ответы нельзя надёжно сохранить.\n\nКогда войдёте, напишите сюда ещё раз — продолжим уже с сохранением на сервере.',
      extractedProfile: {},
      extractedData: {},
      currentStep: 3,
      isComplete: false,
      contextCompacted: false,
      contextStats: null,
    };
  }

  return {
    response:
      'Я всё ещё жду входа в аккаунт. Без него я не могу продолжать анамнез: данные не сохраняются между сессиями, и глубокий опрос был бы обманом ожиданий.\n\nНажмите «Войти» в шапке (Google или email). Если вы уже входили — проверьте, что рядом отображается аккаунт, и напишите снова.',
    extractedProfile: {},
    extractedData: {},
    currentStep: 4,
    isComplete: false,
    contextCompacted: false,
    contextStats: null,
  };
}
