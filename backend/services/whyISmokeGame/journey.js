import { HANDOFF_COPY, GAME_PHASE, SESSION_STATUS } from './constants.js';
import { createDefinition, getCellBySlot } from './definition.js';
import { firstVisitQuestion } from './firstVisit.js';
import { describeMove } from './movement.js';
import { composeMasterMessage, shapeCellDialogue } from './master/result.js';
import { runGameMasterTurn } from './master/run.js';
import {
  applyDiceRoll,
  canApplyDiceRoll,
  closeCurrentCell,
  createGameSession,
  currentTurn,
  normalizeGameSession,
  recordUserAnswer,
} from './session.js';

const READINESS_SIGNALS = [
  'готов', 'готова', 'готовы', 'да', 'yes', 'ready', 'погнали',
  'начнём', 'начнем', 'давай', 'без масок', 'согласен', 'согласна',
  'поехали', 'можно', 'ок', 'ok',
];

export const STAGE2_CTA = HANDOFF_COPY.cta;
export const LEGACY_STAGE2_CTA = 'Перейти к разбору мифов';
export const START_GAME_CTA = 'Начать игру';

export const GAME_INTRO_COPY = [
  '**Как проходит игра**',
  '',
  'Вы бросаете кубик и попадаете на разные клетки.',
  '',
  'Каждая клетка поможет посмотреть на ваше курение с другой стороны.',
  '',
  'Я буду задавать вопросы и разговаривать с вами о том, что появляется по ходу игры.',
  '',
  'Здесь нет правильных ответов — говорите то, что действительно приходит в голову.',
  '',
  'Наша задача — понять:',
  '',
  '**что до сих пор удерживает сигарету в вашей жизни.**',
  '',
  'Когда будете готовы — бросайте кубик.',
].join('\n');

const READY_TO_ROLL_COPY = 'Когда будете готовы — бросайте кубик.';

export function looksLikePlayButton(text) {
  const t = String(text || '').trim().toLowerCase().replace(/^🎲\s*/, '');
  return t === 'играть' || t === 'начать игру';
}

export function looksLikeReadinessConfirmation(text) {
  if (looksLikePlayButton(text)) return true;
  const t = String(text || '').trim().toLowerCase().replace(/^я\s+/, '');
  if (!t) return false;
  if (/^🎲/.test(t)) return false;
  return READINESS_SIGNALS.some((s) => t === s || t.startsWith(`${s} `) || t.startsWith(`${s},`) || t.startsWith(`${s}.`));
}

export function updateJourneySummary(anamnesis, summary) {
  const text = typeof summary === 'string' && summary.trim() ? summary.trim() : null;
  return { ...anamnesis, lilaJourneySummary: text };
}

export function normalizeCompatBoardState(raw) {
  if (raw && typeof raw === 'object' && (raw.currentPosition != null || raw.entered != null || raw.turns)) {
    return toCompatLilaState(raw);
  }
  if (!raw || typeof raw !== 'object') {
    return { position: 0, gameEntered: false, visitedCells: [], lastMove: null };
  }
  const position = Number.isFinite(Number(raw.position)) ? Math.max(0, Number(raw.position)) : 0;
  const visitedCells = Array.isArray(raw.visitedCells)
    ? [...new Set(raw.visitedCells.map(Number).filter((n) => n >= 1))]
    : [];
  const last = raw.lastMove;
  const lastMove = last && Number.isInteger(last.from) && Number.isInteger(last.roll)
    ? { from: last.from, roll: last.roll }
    : null;
  return {
    position,
    gameEntered: Boolean(raw.gameEntered),
    visitedCells,
    lastMove,
  };
}

export function isDiceRollMessage(text) {
  return /^🎲\s*[1-6]$/.test(String(text || '').trim());
}

export function acceptsStage2Handoff(message, anamnesis) {
  const t = String(message || '').trim();
  if (t !== STAGE2_CTA && t !== LEGACY_STAGE2_CTA) return false;
  if (readHandoff(anamnesis)) return true;
  return typeof anamnesis?.lilaJourneySummary === 'string' && Boolean(anamnesis.lilaJourneySummary.trim());
}

export function readHandoff(anamnesis) {
  return anamnesis?.stage2Handoff
    || anamnesis?.whyISmokeGame?.handoff
    || null;
}

export function collectInitialAnswer(conversationHistory = [], pending = '') {
  const fromHistory = conversationHistory
    .filter((item) => item?.isUser && typeof item.text === 'string')
    .map((item) => item.text.trim())
    .filter((text) => text && !isDiceRollMessage(text) && !looksLikePlayButton(text) && text !== STAGE2_CTA && text !== LEGACY_STAGE2_CTA);
  const chunks = [pending, ...fromHistory].map((text) => String(text || '').trim()).filter(Boolean);
  return [...new Set(chunks)].join('\n').slice(0, 2000);
}

export function toCompatLilaState(session) {
  const state = session ? normalizeGameSession(session) : null;
  if (!state) {
    return { position: 0, gameEntered: false, visitedCells: [], lastMove: null };
  }
  const turn = currentTurn(state);
  const visitedSlots = [...new Set(
    state.turns
      .filter((item) => Number.isInteger(item.toPosition) && item.toPosition > 0)
      .map((item) => item.toPosition),
  )];
  return {
    position: state.currentPosition,
    gameEntered: state.entered,
    visitedCells: visitedSlots,
    lastMove: turn && turn.diceValue
      ? { from: turn.fromPosition, roll: turn.diceValue }
      : null,
  };
}

export function describeGameBoard(session, definition) {
  const def = definition || createDefinition();
  if (!session) {
    return '';
  }
  const state = normalizeGameSession(session);
  const turn = currentTurn(state);
  if (!turn || !state.currentPosition) {
    return 'Брось кубик — первый ход откроет клетку.';
  }
  const title = shownTitle(state, def, state.currentPosition);
  const cell = getCellBySlot(def, turn.toPosition);
  const move = {
    roll: turn.diceValue,
    fromPosition: turn.fromPosition,
    toPosition: turn.toPosition,
    landedSlot: turn.landedSlot,
    cell: { title: turn.cellTitleShownToUser || cell?.title || title },
    wrapped: turn.wrapped,
    revisit: turn.revisit,
  };
  return describeMove(move);
}

/**
 * Живой ход этапа 1. Этап 2 отсюда не стартует.
 * @param {{ runMaster?: Function }} [deps]
 */
export async function handleWhyISmokePhase({
  message,
  anamnesis = {},
  conversationHistory = [],
  userId = null,
}, deps = {}) {
  const runMaster = deps.runMaster || ((args) => runGameMasterTurn(args));
  const definition = createDefinition(anamnesis.whyISmokeDefinition);
  const msg = String(message || '').trim();
  let session = anamnesis.whyISmokeGame ? normalizeGameSession(anamnesis.whyISmokeGame) : null;
  let pendingInitialAnswer = typeof anamnesis.pendingInitialAnswer === 'string' ? anamnesis.pendingInitialAnswer : '';

  if (acceptsStage2Handoff(msg, { ...anamnesis, whyISmokeGame: session, stage2Handoff: anamnesis.stage2Handoff })) {
    return pack({
      kind: 'handoff_accept',
      response: '',
      session,
      definition,
      diceReady: false,
      pendingInitialAnswer: '',
    });
  }

  const introSeen = anamnesis.gameIntroSeen === true;

  if (!session && isDiceRollMessage(msg)) {
    const roll = Number.parseInt(msg.replace(/^🎲\s*/, ''), 10);
    return beginFirstTurn({
      runMaster,
      definition,
      userId,
      roll,
      userMessage: msg,
      initialAnswer: collectInitialAnswer(conversationHistory, pendingInitialAnswer),
    });
  }

  if (!session && looksLikePlayButton(msg)) {
    return pack({
      kind: introSeen ? 'ready_to_roll' : 'game_intro',
      response: introSeen ? READY_TO_ROLL_COPY : GAME_INTRO_COPY,
      session: null,
      definition,
      diceReady: true,
      pendingInitialAnswer,
      gameIntroSeen: true,
    });
  }

  if (!session) {
    pendingInitialAnswer = [pendingInitialAnswer, msg].filter(Boolean).join('\n').slice(0, 2000);
    return pack({
      kind: 'prestart',
      response: 'Когда будете готовы — нажмите «Начать игру».',
      session: null,
      definition,
      diceReady: false,
      pendingInitialAnswer,
      gameIntroSeen: introSeen,
    });
  }

  if (session.status === SESSION_STATUS.COMPLETED && session.handoff) {
    return pack({
      kind: 'await_handoff',
      response: `${session.handoff.transition?.message || HANDOFF_COPY.message}`,
      session,
      definition,
      diceReady: false,
      pendingInitialAnswer: '',
    });
  }

  if (isDiceRollMessage(msg)) {
    if (!canApplyDiceRoll(session)) {
      return pack({
        kind: 'wait_answer',
        response: 'Сначала ответь на вопрос — потом бросай.',
        session,
        definition,
        diceReady: false,
        pendingInitialAnswer: '',
      });
    }
    const roll = Number.parseInt(msg.replace(/^🎲\s*/, ''), 10);
    let move;
    try {
      const applied = applyDiceRoll(session, definition, roll);
      session = applied.session;
      move = applied.move;
    } catch (error) {
      return pack({
        kind: 'error',
        response: error.message || 'Этот бросок сейчас нельзя сделать.',
        session,
        definition,
        diceReady: canApplyDiceRoll(session),
        pendingInitialAnswer: '',
      });
    }
    return callMaster({
      runMaster,
      session,
      definition,
      userMessage: msg,
      extra: { event: 'new_cell' },
    });
  }

  if (session.phase === GAME_PHASE.FINAL_REALITY_CHECK) {
    return callMaster({
      runMaster,
      session,
      definition,
      userMessage: msg,
      extra: { event: 'reality_check_answer' },
    });
  }

  if (session.phase === GAME_PHASE.MIRROR && !session.finalAnswer) {
    return callMaster({
      runMaster,
      session,
      definition,
      userMessage: msg,
      extra: { event: 'mirror_answer' },
      appendHandoffCopy: true,
    });
  }

  const turn = currentTurn(session);
  const cellOpen = Boolean(turn?.cellId && !turn.cellClosed);
  const firstReply = cellOpen && !turn.userAnswer;
  if (cellOpen) {
    try {
      session = recordUserAnswer(session, msg);
    } catch {
      // continue even if the reply was already stored
    }
  }

  return callMaster({
    runMaster,
    session,
    definition,
    userMessage: msg,
    extra: { event: firstReply ? 'user_answer' : 'follow_up' },
  });
}

async function beginFirstTurn({ runMaster, definition, userId, roll, userMessage, initialAnswer }) {
  let session = createGameSession({
    userId,
    definition,
    initialAnswer: initialAnswer || '',
  });
  try {
    const applied = applyDiceRoll(session, definition, roll);
    session = applied.session;
  } catch (error) {
    return pack({
      kind: 'error',
      response: error.message || 'Не получилось начать игру.',
      session,
      definition,
      diceReady: true,
      pendingInitialAnswer: '',
    });
  }
  return callMaster({
    runMaster,
    session,
    definition,
    userMessage,
    extra: { event: 'new_cell', firstVisit: true },
  });
}

async function callMaster({ runMaster, session, definition, userMessage, extra = {}, appendHandoffCopy = false }) {
  try {
    const master = await runMaster({ session, definition, userMessage, extra });
    let next = master.session || session;
    let response = master.message || 'Продолжим.';
    let diceReady = master.diceReady === true;
    if ((extra.event === 'user_answer' || extra.event === 'follow_up') && next.phase === GAME_PHASE.PLAYING) {
      const turn = currentTurn(next);
      const shaped = shapeCellDialogue({
        messageToUser: response,
        question: '',
        diceReady,
      }, {
        openingQuestion: turn?.openingQuestion || turn?.aiQuestion || '',
        userMessage,
        event: extra.event,
        exchangeCount: (turn?.userAnswers || []).length,
      });
      response = composeMasterMessage(shaped) || response;
      diceReady = shaped.diceReady === true;
    }
    if (diceReady && next.phase === GAME_PHASE.PLAYING && !currentTurn(next)?.cellClosed) {
      next = closeCurrentCell(next);
    }
    if ((appendHandoffCopy || master.handoff) && next.handoff?.transition?.message) {
      if (!response.includes(next.handoff.transition.message)) {
        response = `${response}\n\n${next.handoff.transition.message}`;
      }
    }
    return pack({
      kind: master.handoff ? 'handoff_ready' : 'master',
      response,
      session: next,
      definition,
      diceReady,
      pendingInitialAnswer: '',
      master,
    });
  } catch (error) {
    console.error('why_i_smoke game master error:', error);
    const diceReady = canApplyDiceRoll(session);
    return pack({
      kind: 'error',
      response: fallbackMasterMessage(session, definition, extra, diceReady, userMessage),
      session,
      definition,
      diceReady,
      pendingInitialAnswer: '',
    });
  }
}

function fallbackMasterMessage(session, definition, extra, diceReady, userMessage = '') {
  const cell = getCellBySlot(definition, session?.currentPosition);
  if (extra?.event === 'new_cell' && cell) {
    return firstVisitQuestion(cell);
  }
  if (extra?.event === 'user_answer' || extra?.event === 'follow_up') {
    return 'Не получилось продолжить. Напиши ещё раз — останемся в этой теме.';
  }
  if (diceReady) {
    return 'Не получилось продолжить. Напиши ещё раз или брось кубик.';
  }
  return 'Не получилось продолжить. Напиши, что думаешь сейчас — попробуем ещё раз.';
}

function pack({ kind, response, session, definition, diceReady, pendingInitialAnswer, master = null, gameIntroSeen = false }) {
  const boardStatus = describeGameBoard(session, definition);
  const lilaState = toCompatLilaState(session);
  const handoff = session?.handoff || null;
  return {
    kind,
    response,
    diceReady,
    session,
    definition,
    boardStatus,
    lilaState,
    handoff,
    pendingInitialAnswer: pendingInitialAnswer || '',
    journeySummary: handoff?.userFinalExplanation || session?.finalAnswer || null,
    master,
    gameIntroSeen: Boolean(gameIntroSeen || session?.currentPosition),
  };
}

function shownTitle(session, definition, slot) {
  const cell = getCellBySlot(definition, slot);
  if (!cell) return '';
  return session.displayTitles?.[cell.id] || cell.title;
}
