import { GAME_PHASE } from '../constants.js';
import { normalizeGameSession, recordNarration } from '../session.js';
import { applyGameMasterResult } from './apply.js';
import { buildGameMasterContext, formatGameMasterContext } from './context.js';
import { attachHandoff, buildStage2Handoff } from './handoff.js';
import { buildFinalEcho, buildMirror, recordMirrorAnswer } from './mirror.js';
import { GAME_MASTER_PROMPT, GAME_MASTER_RESULT_SCHEMA } from './prompt.js';
import { composeMasterMessage, normalizeGameMasterResult } from './result.js';

let defaultOpenAI = null;

async function resolveOpenAIClient(openai) {
  if (openai?.chat?.completions?.create) return openai;
  if (!defaultOpenAI) {
    const { default: OpenAI } = await import('openai');
    defaultOpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return defaultOpenAI;
}

export function buildGameMasterMessages({ session, definition, userMessage = '', extra = {} } = {}) {
  const context = buildGameMasterContext({ session, definition, userMessage, extra });
  return {
    context,
    system: GAME_MASTER_PROMPT,
    user: `${formatGameMasterContext(context)}\n\nВерни только JSON по схеме:\n${JSON.stringify(GAME_MASTER_RESULT_SCHEMA, null, 2)}`,
  };
}

export async function runGameMasterTurn({
  openai,
  model,
  session,
  definition,
  userMessage = '',
  extra = {},
} = {}) {
  const state = normalizeGameSession(session);
  if (state.phase === GAME_PHASE.MIRROR && userMessage && !state.finalAnswer) {
    return finalizeWithEcho(state, userMessage);
  }

  const { system, user, context } = buildGameMasterMessages({
    session: state,
    definition,
    userMessage,
    extra,
  });

  const client = await resolveOpenAIClient(openai);
  if (!client?.chat?.completions?.create) {
    throw new Error('OpenAI client is required to run the game master');
  }

  const completion = await client.chat.completions.create({
    model: model || process.env.OPENAI_MODEL || 'gpt-5.4-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
  return interpretGameMasterOutput({
    session: state,
    definition,
    raw: parsed,
    userMessage,
    extra,
    context,
  });
}

export function interpretGameMasterOutput({ session, definition, raw, userMessage = '', extra = {}, context = null } = {}) {
  const applied = applyGameMasterResult(session, definition, raw, {
    userMessage,
    event: extra.event,
  });
  let next = applied.session;
  const mirror = next.phase === GAME_PHASE.MIRROR && !next.finalAnswer
    ? buildMirror(next)
    : null;
  if (mirror) {
    next = recordNarrationForMirror(next, mirror);
  }
  const message = mirror ? mirror.messageToUser : applied.message;
  const result = mirror
    ? { ...applied.result, messageToUser: mirror.messageToUser, question: mirror.question, diceReady: false }
    : applied.result;

  return {
    session: next,
    result,
    message,
    saturation: applied.saturation,
    diceReady: mirror ? false : applied.diceReady,
    mirror,
    handoff: null,
    context,
  };
}

export function finalizeWithEcho(session, finalAnswer) {
  let state = recordMirrorAnswer(session, finalAnswer);
  const echo = buildFinalEcho(state, finalAnswer);
  const handoff = buildStage2Handoff(state);
  state = attachHandoff(state, handoff);
  return {
    session: state,
    result: normalizeGameMasterResult({
      observation: 'Финальный ответ принят. Этап 2 не запускать.',
      messageToUser: echo.messageToUser,
      question: '',
      diceReady: false,
    }),
    message: echo.messageToUser,
    saturation: state.saturation,
    diceReady: false,
    mirror: null,
    handoff,
    context: null,
  };
}

function recordNarrationForMirror(session, mirror) {
  try {
    return recordNarration(session, { observation: mirror.messageToUser, question: mirror.question });
  } catch {
    return session;
  }
}

export { composeMasterMessage };
