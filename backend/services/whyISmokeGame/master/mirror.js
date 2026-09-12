import { DEFAULT_INTENTION } from '../constants.js';
import { completeGame, normalizeGameSession } from '../session.js';

export function buildMirror(session) {
  const state = normalizeGameSession(session);
  const observations = pickUserObservations(state, 4);
  const question = 'Почему ты до сих пор куришь?';
  const lines = state.initialAnswer
    ? [
      `Исходный вопрос: «${state.initialIntention || DEFAULT_INTENTION}»`,
      `В начале ты сказал: «${state.initialAnswer}»`,
      '',
      'Что уже проступило твоими словами:',
      ...observations.map((text) => `— ${text}`),
      '',
      question,
    ]
    : [
      'В начале у нас был один вопрос:',
      `**${state.initialIntention || DEFAULT_INTENTION}**`,
      '',
      'За игру мы несколько раз возвращались к тому, что уже проступило твоими словами:',
      ...observations.map((text) => `— ${text}`),
      '',
      'А теперь попробуйте ответить сами:',
      `**${question}**`,
    ];

  return {
    intention: state.initialIntention || DEFAULT_INTENTION,
    initialAnswer: state.initialAnswer,
    observations,
    question,
    messageToUser: lines.join('\n'),
  };
}

export function buildFinalEcho(session, finalAnswer) {
  const text = String(finalAnswer || '').trim();
  return {
    messageToUser: text
      ? `Запомню это твоими словами: ${text}`
      : 'Запомню твой ответ как есть.',
    question: '',
  };
}

export function recordMirrorAnswer(session, finalAnswer) {
  return completeGame(session, finalAnswer);
}

function pickUserObservations(session, max) {
  const quotes = [];
  for (const turn of session.turns) {
    if (turn.userAnswer && turn.userAnswer.length > 12) {
      quotes.push(clipQuote(turn.userAnswer));
    }
  }
  if (session.initialAnswer && session.initialAnswer.length > 8) {
    quotes.unshift(clipQuote(session.initialAnswer));
  }
  return unique(quotes).slice(0, max);
}

function clipQuote(text) {
  const clean = String(text).trim().replace(/\s+/g, ' ');
  return clean.length > 180 ? `${clean.slice(0, 177)}…` : clean;
}

function unique(list) {
  return [...new Set(list)];
}
