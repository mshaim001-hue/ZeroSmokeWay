import { HANDOFF_COPY, SESSION_STATUS } from './constants.js';
import { createDefinition, getCellBySlot } from './definition.js';
import { describeMove } from './movement.js';
import { runGameMasterTurn } from './master/run.js';
import {
  applyDiceRoll,
  canApplyDiceRoll,
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

export function looksLikeReadinessConfirmation(text) {
  const t = String(text || '').trim().toLowerCase().replace(/^я\s+/, '');
  if (t === 'начать игру') return true;
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
    .filter((text) => text && !isDiceRollMessage(text) && text !== 'Начать игру' && text !== STAGE2_CTA && text !== LEGACY_STAGE2_CTA);
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
    return `Вход в игру — при выпадении ${def.entryRoll}`;
  }
  const state = normalizeGameSession(session);
  const turn = currentTurn(state);
  const title = shownTitle(state, def, state.currentPosition);
  const current = state.entered
    ? `Сейчас: ${state.currentPosition} — ${title}`
    : `Вход в игру — при выпадении ${def.entryRoll}`;

  if (!turn) return current;
  if (turn.entryAttempt && !turn.entrySuccess) {
    return `Выпало ${turn.diceValue} — нужна ${def.entryRoll}. Можно бросить ещё раз.`;
  }

  const cell = getCellBySlot(def, turn.toPosition);
  const move = {
    roll: turn.diceValue,
    fromPosition: turn.fromPosition,
    toPosition: turn.toPosition,
    landedSlot: turn.landedSlot,
    cell: { title: turn.cellTitleShownToUser || cell?.title || '' },
    jump: turn.jump,
    entryAttempt: turn.entryAttempt,
    entrySuccess: turn.entrySuccess,
    overshot: turn.overshot,
  };
  return `${describeMove(move, def)}\n${current}`;
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

  if ((!session || !session.entered) && looksLikeReadinessConfirmation(msg)) {
    session = createGameSession({
      userId,
      definition,
      initialAnswer: collectInitialAnswer(conversationHistory, pendingInitialAnswer),
    });
    return pack({
      kind: 'start',
      response: `Начнём. Брось кубик — для входа нужна ${definition.entryRoll === 6 ? 'шестёрка' : definition.entryRoll}.`,
      session,
      definition,
      diceReady: true,
      pendingInitialAnswer: '',
    });
  }

  if (!session) {
    if (isDiceRollMessage(msg)) {
      return pack({
        kind: 'need_start',
        response: 'Сначала нажми «Начать игру». Для входа потом понадобится шестёрка.',
        session: null,
        definition,
        diceReady: false,
        pendingInitialAnswer,
      });
    }
    pendingInitialAnswer = [pendingInitialAnswer, msg].filter(Boolean).join('\n').slice(0, 2000);
    return pack({
      kind: 'prestart',
      response: 'Намерение уже есть: «Почему я до сих пор курю?» Когда будешь готов — нажми «Начать игру».',
      session: null,
      definition,
      diceReady: false,
      pendingInitialAnswer,
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
    if (move.entryAttempt && !move.entrySuccess) {
      return pack({
        kind: 'failed_entry',
        response: `Для входа нужна шестёрка. Можно бросить ещё раз.`,
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
      userMessage: msg,
      extra: { event: 'new_cell' },
    });
  }

  if (session.phase === 'mirror' && !session.finalAnswer) {
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
  const awaitingAnswer = turn && !turn.userAnswer && !(turn.entryAttempt && !turn.entrySuccess);
  if (awaitingAnswer) {
    try {
      session = recordUserAnswer(session, msg);
    } catch {
      // already recorded — continue
    }
  }

  return callMaster({
    runMaster,
    session,
    definition,
    userMessage: msg,
    extra: { event: awaitingAnswer ? 'user_answer' : 'follow_up' },
  });
}

async function callMaster({ runMaster, session, definition, userMessage, extra, appendHandoffCopy = false }) {
  try {
    const master = await runMaster({ session, definition, userMessage, extra });
    const next = master.session || session;
    let response = master.message || 'Продолжим.';
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
      diceReady: master.diceReady === true,
      pendingInitialAnswer: '',
      master,
    });
  } catch (error) {
    console.error('why_i_smoke game master error:', error);
    return pack({
      kind: 'error',
      response: 'Не удалось получить ответ ведущего. Напиши ещё раз или брось кубик, когда он будет доступен.',
      session,
      definition,
      diceReady: canApplyDiceRoll(session),
      pendingInitialAnswer: '',
    });
  }
}

function pack({ kind, response, session, definition, diceReady, pendingInitialAnswer, master = null }) {
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
  };
}

function shownTitle(session, definition, slot) {
  const cell = getCellBySlot(definition, slot);
  if (!cell) return '';
  return session.displayTitles?.[cell.id] || cell.title;
}
