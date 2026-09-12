import { HYPOTHESIS_ACTION } from '../constants.js';

const ACTIONS = new Set(Object.values(HYPOTHESIS_ACTION));

const SYSTEM_TALK = /рабоч(ая|ую|ей) верси|рабоч(ая|ую|ей) гипотез|зафиксируем гипотез|сохраним (observation|наблюдение)|недостаточно (данных|информации)|данная гипотеза|ответ не соответствует|гипотеза (ослаблена|не сформирована|не выдерж)|нужно уточнение|это уже ответ на этот ход/i;

const FORM_FILL = /конкретный пример|можете (привести|вспомнить)|а что произошло( прямо)? перед|что произошло( прямо)? перед этим|вспомните (недавний )?момент, когда/i;

const SMOKE_WORDS = new Set([
  'сигарета', 'сигареты', 'сигарету', 'сигаретой', 'сигарет',
  'курить', 'курю', 'курил', 'курила', 'курите', 'курение', 'курения',
]);

const STOP = new Set([
  'что', 'как', 'где', 'когда', 'кто', 'чем', 'это', 'эта', 'этот', 'эти',
  'для', 'или', 'как', 'уже', 'ещё', 'еще', 'вас', 'вам', 'вы', 'ты', 'тебе',
  'тебя', 'мне', 'меня', 'мы', 'нас', 'он', 'она', 'они', 'его', 'её',
  'прямо', 'перед', 'этим', 'том', 'тем', 'всё', 'все', 'равно', 'было',
  'были', 'есть', 'тут', 'там', 'здесь', 'очень', 'просто', 'вроде',
]);

export function normalizeGameMasterResult(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const question = firstQuestion(src.question ?? src.mainQuestion);
  return {
    observation: clean(src.observation, 800),
    messageToUser: clean(src.messageToUser ?? src.message, 1600),
    question,
    displayTitle: clean(src.displayTitle, 80) || null,
    hypothesisUpdates: normalizeUpdates(src.hypothesisUpdates),
    patterns: normalizePatterns(src.patterns),
    uncoveredDomains: Array.isArray(src.uncoveredDomains)
      ? src.uncoveredDomains.map((item) => String(item).trim()).filter(Boolean).slice(0, 8)
      : [],
    shouldRealityCheck: src.shouldRealityCheck === true,
    possibleSaturation: src.possibleSaturation === true,
    userRecognizesHypothesis: src.userRecognizesHypothesis === true,
    diceReady: src.diceReady === true,
  };
}

export function composeMasterMessage(result) {
  const message = result.messageToUser || result.observation || '';
  if (!result.question) return message.trim();
  if (message.includes(result.question)) return message.trim();
  return [message.trim(), result.question].filter(Boolean).join('\n\n');
}

export function shapeCellDialogue(result, {
  openingQuestion = '',
  userMessage = '',
  event = '',
  exchangeCount = 0,
} = {}) {
  const inDialogue = event === 'user_answer' || event === 'follow_up';
  let message = stripSystemTalk(result.messageToUser || '');
  let question = result.question || '';
  let diceReady = result.diceReady === true;

  if (!inDialogue) {
    return { ...result, messageToUser: message, question, diceReady: false };
  }

  if (exchangeCount >= 12) {
    return {
      ...result,
      messageToUser: stripQuestions(message) || naturalClose(),
      question: '',
      diceReady: true,
    };
  }

  const embedded = extractLastQuestion(message);
  const probe = question || embedded;
  if (probe && isFormFillReask(probe, openingQuestion, userMessage)) {
    if (looksLikeRejection(userMessage)) {
      return {
        ...result,
        messageToUser: 'Хорошо. Значит, здесь мы, похоже, смотрели не туда.',
        question: '',
        diceReady: true,
      };
    }
    const follow = followLastThread(userMessage);
    return {
      ...result,
      messageToUser: stripQuestions(message) || follow.message,
      question: follow.question,
      diceReady: false,
    };
  }

  if (!question && embedded && !isFormFillReask(embedded, openingQuestion, userMessage)) {
    question = embedded;
    diceReady = false;
  }

  if (question) {
    return { ...result, messageToUser: message, question, diceReady: false };
  }

  if (diceReady || !hasQuestionMark(message)) {
    return {
      ...result,
      messageToUser: stripQuestions(message) || naturalClose(),
      question: '',
      diceReady: true,
    };
  }

  return { ...result, messageToUser: message, question: '', diceReady: false };
}

export function closeCellAfterAnswer(result, userMessage = '') {
  return {
    ...result,
    question: '',
    diceReady: true,
    messageToUser: stripQuestions(stripSystemTalk(result.messageToUser)) || naturalClose(userMessage),
  };
}

export function stripQuestions(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const parts = raw
    .split(/(?<=[.!…?\n])\s+/)
    .map((part) => part.trim())
    .filter((part) => part && !/[?？]/.test(part) && !FORM_FILL.test(part));
  return parts.join(' ').trim();
}

export function stripSystemTalk(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const parts = raw
    .split(/(?<=[.!…?\n])\s+/)
    .map((part) => part.trim())
    .filter((part) => part && !SYSTEM_TALK.test(part));
  return parts.join(' ').trim();
}

export function isFormFillReask(question, openingQuestion = '', userMessage = '') {
  const q = normalizeProbe(question);
  if (!q) return false;
  if (FORM_FILL.test(q)) return true;
  if (openingQuestion && similarProbe(q, normalizeProbe(openingQuestion))) return true;
  if (looksLikeRejection(userMessage) && sharesTheme(q, openingQuestion)) return true;
  return false;
}

export function followLastThread(userMessage = '') {
  const said = String(userMessage || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  if (!said) {
    return {
      message: 'Интересно.',
      question: 'Что в этом для тебя сейчас самое живое?',
    };
  }
  const word = firstMeaningfulWord(said);
  return {
    message: word
      ? `«${capitalize(word)}» — из этого уже можно идти дальше.`
      : 'Вот это уже интереснее.',
    question: `Что именно ты имеешь в виду под «${said}»?`,
  };
}

function naturalClose() {
  return 'Пока оставим это здесь.';
}

function looksLikeRejection(text) {
  const t = String(text || '').trim().toLowerCase();
  return /^(нет|не\b|не про меня|вообще не|такого нет|не думаю|это не про)/i.test(t);
}

function similarProbe(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  if ((a.includes(b) || b.includes(a)) && a.length > 16 && b.length > 16) return true;
  return jaccard(contentTokens(a), contentTokens(b)) >= 0.45;
}

function sharesTheme(question, opening) {
  const theme = contentTokens(opening).filter((word) => word.length > 5 && !SMOKE_WORDS.has(word));
  if (!theme.length) return false;
  const asked = contentTokens(question);
  return theme.some((word) => asked.some((item) => sameStem(word, item)));
}

function sameStem(a, b) {
  const left = a.slice(0, 5);
  const right = b.slice(0, 5);
  return left === right || a.startsWith(right) || b.startsWith(left);
}

function extractLastQuestion(text) {
  const parts = String(text || '')
    .split(/(?<=[?？])/)
    .map((part) => part.trim())
    .filter((part) => /[?？]/.test(part));
  return parts.at(-1) || '';
}

function hasQuestionMark(text) {
  return /[?？]/.test(String(text || ''));
}

function normalizeProbe(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[«»"“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function contentTokens(text) {
  return normalizeProbe(text)
    .split(/[^a-zа-яё0-9]+/i)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !STOP.has(word));
}

function jaccard(a, b) {
  const left = new Set(a);
  const right = new Set(b);
  if (!left.size || !right.size) return 0;
  let inter = 0;
  for (const item of left) {
    if (right.has(item)) inter += 1;
  }
  return inter / new Set([...left, ...right]).size;
}

function firstMeaningfulWord(text) {
  return contentTokens(text)[0] || '';
}

function capitalize(word) {
  return word ? word.charAt(0).toUpperCase() + word.slice(1) : '';
}

function normalizeUpdates(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const action = String(item.action || '').trim();
      if (!ACTIONS.has(action)) return null;
      const statement = clean(item.statement, 500);
      if (action === HYPOTHESIS_ACTION.CREATE && !statement) return null;
      return {
        action,
        hypothesisId: item.hypothesisId ? String(item.hypothesisId) : null,
        statement: statement || null,
        text: clean(item.text ?? item.evidence ?? item.counterEvidence, 400) || null,
        recognized: item.recognized === true,
      };
    })
    .filter(Boolean)
    .slice(0, 8);
}

function normalizePatterns(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const pattern = {
        trigger: clean(item.trigger, 400) || null,
        action: clean(item.action, 400) || null,
        function: clean(item.function ?? item.fn, 400) || null,
        belief: clean(item.belief, 400) || null,
      };
      if (!pattern.trigger && !pattern.action && !pattern.function && !pattern.belief) return null;
      return pattern;
    })
    .filter(Boolean)
    .slice(0, 6);
}

function firstQuestion(value) {
  const text = clean(value, 400);
  if (!text) return '';
  const parts = text.split(/(?<=[?？])/).map((part) => part.trim()).filter(Boolean);
  return parts[0] || text;
}

function clean(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}
