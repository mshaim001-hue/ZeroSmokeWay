/**
 * Сценарий для гостя до входа: без LLM-анамнеза (ответы не сохраняются на сервере).
 * Тексты не должны дублировать приветствие в UI и не противоречить запретам в промпте анамнеза
 * (никаких «спасибо, что написали», повторного «как вас зовут» после явного имени).
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
 * Похоже на ответ только именем (после «Как вас зовут?» в UI) — без повторного подтверждения.
 * @param {string} text
 */
function looksLikePlainNameReply(text) {
  const t = text.trim();
  if (!t || t.length > 40) return false;
  if (/кур|сигар|пач|никотин|лет|год|день|раз|штук/i.test(t)) return false;
  return Boolean(guessCallName(t));
}

function paragraphExplainAndAccountHint() {
  return `Дальше — спокойно разобрать вашу историю с сигаретами: что даёт курение, что раздражает, чего боитесь без сигареты — по одному короткому вопросу за раз, без интервью.\n\nЧтобы сохранять разговор на сервере и вести учёт прогресса (в том числе с даты, когда вы бросите или уже бросили), нужен аккаунт — об этом сразу после этого шага.`;
}

function paragraphLoginAsk() {
  return `Чтобы не терять переписку между заходами и с устройствами, и чтобы вести учёт прогресса (в том числе дни без сигарет с момента, когда вы бросите или уже бросили), нужен вход в аккаунт.\n\nНажмите вверху «Войти»: Google или почта с паролем. Пока вы не войдёте, я не продолжу сбор анамнеза — ответы нельзя надёжно сохранить.\n\nКогда войдёте, напишите сюда ещё раз — продолжим уже с сохранением на сервере.`;
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
  const first = users[0] || '';

  if (uc === 1) {
    const guess = first ? guessCallName(first) : null;
    const plainName = first && looksLikePlainNameReply(first);

    if (plainName && guess) {
      return {
        response: `Принято.\n\n${paragraphExplainAndAccountHint()}`,
        extractedProfile: { name: guess },
        extractedData: {},
        currentStep: 1,
        isComplete: false,
        contextCompacted: false,
        contextStats: null,
      };
    }

    if (guess && !plainName) {
      return {
        response: `Запишу «${guess}».\n\n${paragraphExplainAndAccountHint()}`,
        extractedProfile: { name: guess },
        extractedData: {},
        currentStep: 1,
        isComplete: false,
        contextCompacted: false,
        contextStats: null,
      };
    }

    return {
      response:
        'В приветствии выше уже спросили имя — если коротко напишете здесь, как к вам обращаться, дальше будет проще.',
      extractedProfile: {},
      extractedData: {},
      currentStep: 1,
      isComplete: false,
      contextCompacted: false,
      contextStats: null,
    };
  }

  if (uc === 2) {
    const firstWasPlainName = Boolean(first && looksLikePlainNameReply(first));

    if (firstWasPlainName) {
      const n = pickDisplayName(users);
      return {
        response: paragraphLoginAsk(),
        extractedProfile: n ? { name: n } : {},
        extractedData: {},
        currentStep: 3,
        isComplete: false,
        contextCompacted: false,
        contextStats: null,
      };
    }

    const name = pickDisplayName(users);
    const lead = name ? `Ок, ${name}.` : 'Хорошо.';
    const response = `${lead}\n\n${paragraphExplainAndAccountHint()}`;
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
    const firstWasPlainName = Boolean(first && looksLikePlainNameReply(first));
    if (firstWasPlainName && users.length >= 2) {
      return {
        response:
          'Пока нет входа в аккаунт, продолжать анамнез нельзя — ответы не сохраняются между сессиями.\n\nНажмите «Войти» в шапке (Google или email). Если уже входили — проверьте, что аккаунт отображается, и напишите снова.',
        extractedProfile: {},
        extractedData: {},
        currentStep: 4,
        isComplete: false,
        contextCompacted: false,
        contextStats: null,
      };
    }

    return {
      response: paragraphLoginAsk(),
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
      'Пока нет входа в аккаунт, продолжать анамнез нельзя — ответы не сохраняются между сессиями.\n\nНажмите «Войти» в шапке (Google или email). Если уже входили — проверьте, что аккаунт отображается, и напишите снова.',
    extractedProfile: {},
    extractedData: {},
    currentStep: 4,
    isComplete: false,
    contextCompacted: false,
    contextStats: null,
  };
}
