import { DEFAULT_INTENTION, GAME_PHASE, HYPOTHESIS_STATUS, SESSION_STATUS } from './constants.js';
import { createDefinition } from './definition.js';
import { addHypothesisEvidence, createHypothesis, setHypothesisStatus } from './hypotheses.js';
import { createId, nowIso } from './ids.js';
import { applyDefinitionMove } from './movement.js';
import { createPattern, isPatternIncomplete } from './patterns.js';

const STATUSES = new Set(Object.values(SESSION_STATUS));

export function createGameSession({
  userId = null,
  definition = null,
  initialIntention = DEFAULT_INTENTION,
  initialAnswer = '',
} = {}) {
  const def = createDefinition(definition ?? {});
  const at = nowIso();
  return {
    id: createId('gs'),
    userId: userId ? String(userId) : null,
    definitionId: def.id,
    definitionVersion: def.version,
    status: SESSION_STATUS.ACTIVE,
    initialIntention: String(initialIntention || def.intention),
    initialAnswer: String(initialAnswer || '').trim().slice(0, 2000),
    currentPosition: 0,
    entered: false,
    turnNumber: 0,
    visitedCells: [],
    turns: [],
    conversation: [],
    hypotheses: [],
    discoveredPatterns: [],
    uncoveredDomains: [],
    displayTitles: {},
    phase: GAME_PHASE.PLAY,
    saturation: emptySaturation(),
    userRecognizedHypothesisIds: [],
    handoff: null,
    finalAnswer: null,
    createdAt: at,
    updatedAt: at,
  };
}

export function normalizeGameSession(raw) {
  if (!raw || typeof raw !== 'object') {
    return createGameSession();
  }
  const at = nowIso();
  return {
    id: String(raw.id || createId('gs')),
    userId: raw.userId ? String(raw.userId) : null,
    definitionId: String(raw.definitionId || raw.definition?.id || 'why_i_smoke_game'),
    definitionVersion: Number.isInteger(raw.definitionVersion) ? raw.definitionVersion : 1,
    status: STATUSES.has(raw.status) ? raw.status : SESSION_STATUS.ACTIVE,
    initialIntention: String(raw.initialIntention || DEFAULT_INTENTION),
    initialAnswer: String(raw.initialAnswer || ''),
    currentPosition: Number.isInteger(raw.currentPosition) ? raw.currentPosition : 0,
    entered: Boolean(raw.entered),
    turnNumber: Number.isInteger(raw.turnNumber) ? raw.turnNumber : 0,
    visitedCells: Array.isArray(raw.visitedCells) ? raw.visitedCells.map(String) : [],
    turns: Array.isArray(raw.turns) ? raw.turns.map(normalizeTurn) : [],
    conversation: Array.isArray(raw.conversation) ? raw.conversation.map(normalizeConversationRef).filter(Boolean) : [],
    hypotheses: Array.isArray(raw.hypotheses) ? raw.hypotheses.map((h) => createHypothesis(h)) : [],
    discoveredPatterns: Array.isArray(raw.discoveredPatterns) ? raw.discoveredPatterns.map((p) => createPattern(p)) : [],
    uncoveredDomains: Array.isArray(raw.uncoveredDomains) ? [...new Set(raw.uncoveredDomains.map(String))] : [],
    displayTitles: raw.displayTitles && typeof raw.displayTitles === 'object' && !Array.isArray(raw.displayTitles)
      ? Object.fromEntries(Object.entries(raw.displayTitles).filter(([, title]) => typeof title === 'string' && title.trim()).map(([id, title]) => [id, title.trim().slice(0, 80)]))
      : {},
    phase: Object.values(GAME_PHASE).includes(raw.phase) ? raw.phase : GAME_PHASE.PLAY,
    saturation: normalizeSaturation(raw.saturation),
    userRecognizedHypothesisIds: Array.isArray(raw.userRecognizedHypothesisIds) ? raw.userRecognizedHypothesisIds.map(String) : [],
    handoff: raw.handoff && typeof raw.handoff === 'object' ? raw.handoff : null,
    finalAnswer: raw.finalAnswer ? String(raw.finalAnswer) : null,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : at,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : at,
  };
}

export function currentTurn(session) {
  return session.turns[session.turns.length - 1] ?? null;
}

export function canApplyDiceRoll(session) {
  if (session.status !== SESSION_STATUS.ACTIVE) return false;
  if (session.phase === GAME_PHASE.REALITY_CHECK || session.phase === GAME_PHASE.MIRROR) return false;
  const turn = currentTurn(session);
  if (!turn) return true;
  if (turn.entryAttempt && !turn.entrySuccess) return true;
  return Boolean(turn.userAnswer);
}

export function applyDiceRoll(session, definition, diceValue) {
  const state = normalizeGameSession(session);
  if (!canApplyDiceRoll(state)) {
    throw new Error(state.status === SESSION_STATUS.ACTIVE
      ? 'Current turn is waiting for an answer'
      : `Cannot roll while session is ${state.status}`);
  }

  const move = applyDefinitionMove(definition, {
    position: state.currentPosition,
    entered: state.entered,
  }, diceValue);

  const turnNumber = state.turnNumber + 1;
  const turn = {
    turnNumber,
    diceValue: move.roll,
    fromPosition: move.fromPosition,
    toPosition: move.toPosition,
    landedSlot: move.landedSlot,
    cellId: move.cell?.id ?? null,
    cellTitleShownToUser: resolveShownTitle(state, move.cell),
    jump: move.jump,
    entryAttempt: move.entryAttempt,
    entrySuccess: move.entrySuccess,
    overshot: move.overshot,
    aiObservation: null,
    aiQuestion: null,
    userAnswer: null,
    affectedHypothesisIds: [],
    timestamp: nowIso(),
  };

  const visitedCells = [...state.visitedCells];
  if (move.cell && !visitedCells.includes(move.cell.id)) {
    visitedCells.push(move.cell.id);
  }

  return {
    session: touch({
      ...state,
      currentPosition: move.toPosition,
      entered: move.entered,
      turnNumber,
      visitedCells,
      turns: [...state.turns, turn],
    }),
    turn,
    move,
  };
}

export function recordNarration(session, { observation, question } = {}) {
  const state = normalizeGameSession(session);
  const turn = requireOpenTurn(state, { allowFailedEntry: true });
  const updated = {
    ...turn,
    aiObservation: observation ? String(observation).trim().slice(0, 2000) : turn.aiObservation,
    aiQuestion: question ? String(question).trim().slice(0, 500) : turn.aiQuestion,
  };
  const next = replaceCurrentTurn(state, updated);
  if (observation) {
    next.conversation = appendConversation(next.conversation, {
      role: 'assistant',
      text: [observation, question].filter(Boolean).join('\n'),
      turnNumber: turn.turnNumber,
    });
  }
  return touch(next);
}

export function recordUserAnswer(session, answer) {
  const state = normalizeGameSession(session);
  const turn = requireOpenTurn(state, { allowFailedEntry: true });
  const text = String(answer || '').trim();
  if (!text) {
    throw new Error('userAnswer is required');
  }
  const updated = { ...turn, userAnswer: text.slice(0, 4000) };
  const next = replaceCurrentTurn(state, updated);
  next.conversation = appendConversation(next.conversation, {
    role: 'user',
    text: updated.userAnswer,
    turnNumber: turn.turnNumber,
  });
  return touch(next);
}

export function addSessionHypothesis(session, input) {
  const state = normalizeGameSession(session);
  const hypothesis = createHypothesis(input);
  const turn = currentTurn(state);
  if (turn) {
    turn.affectedHypothesisIds = unique([...turn.affectedHypothesisIds, hypothesis.id]);
  }
  return touch({
    ...state,
    hypotheses: [...state.hypotheses, hypothesis],
    turns: turn ? replaceTurn(state.turns, turn) : state.turns,
  });
}

export function updateSessionHypothesis(session, hypothesisId, patch = {}) {
  const state = normalizeGameSession(session);
  const index = state.hypotheses.findIndex((h) => h.id === hypothesisId);
  if (index < 0) {
    throw new Error(`Hypothesis not found: ${hypothesisId}`);
  }

  let hypothesis = state.hypotheses[index];
  if (patch.statement) {
    hypothesis = { ...hypothesis, statement: String(patch.statement).trim().slice(0, 500) };
  }
  if (patch.evidence) {
    hypothesis = addHypothesisEvidence(hypothesis, patch.evidence, { turnNumber: state.turnNumber });
  }
  if (patch.counterEvidence) {
    hypothesis = addHypothesisEvidence(hypothesis, patch.counterEvidence, {
      counter: true,
      turnNumber: state.turnNumber,
    });
  }
  if (patch.status) {
    hypothesis = setHypothesisStatus(hypothesis, patch.status, { realityChecked: patch.realityChecked });
  } else if (patch.realityChecked) {
    hypothesis = { ...hypothesis, hasBeenRealityChecked: true };
  }

  const turn = currentTurn(state);
  if (turn) {
    turn.affectedHypothesisIds = unique([...turn.affectedHypothesisIds, hypothesis.id]);
  }

  const hypotheses = state.hypotheses.slice();
  hypotheses[index] = hypothesis;
  return touch({
    ...state,
    hypotheses,
    turns: turn ? replaceTurn(state.turns, turn) : state.turns,
  });
}

export function addDiscoveredPattern(session, input) {
  const state = normalizeGameSession(session);
  const pattern = createPattern({
    ...input,
    sourceTurnNumbers: input?.sourceTurnNumbers ?? (state.turnNumber ? [state.turnNumber] : []),
  });
  return touch({
    ...state,
    discoveredPatterns: [...state.discoveredPatterns, pattern],
  });
}

export function addUncoveredDomain(session, domain) {
  const state = normalizeGameSession(session);
  const value = String(domain || '').trim();
  if (!value) return state;
  return touch({
    ...state,
    uncoveredDomains: unique([...state.uncoveredDomains, value]),
  });
}

export function enterReflection(session) {
  const state = normalizeGameSession(session);
  if (state.status === SESSION_STATUS.COMPLETED) {
    throw new Error('Completed session cannot enter reflection');
  }
  return touch({ ...state, status: SESSION_STATUS.REFLECTION, phase: GAME_PHASE.MIRROR });
}

export function resumePlay(session) {
  const state = normalizeGameSession(session);
  if (state.status !== SESSION_STATUS.REFLECTION) {
    throw new Error('Only a reflection session can resume play');
  }
  return touch({ ...state, status: SESSION_STATUS.ACTIVE, phase: GAME_PHASE.PLAY });
}

export function completeGame(session, finalAnswer) {
  const state = normalizeGameSession(session);
  if (state.status === SESSION_STATUS.COMPLETED) {
    throw new Error('Session is already completed');
  }
  const text = String(finalAnswer || '').trim();
  if (!text) {
    throw new Error('finalAnswer is required to complete the game');
  }
  return touch({
    ...state,
    status: SESSION_STATUS.COMPLETED,
    finalAnswer: text.slice(0, 4000),
  });
}

export function sessionResearchView(session) {
  const state = normalizeGameSession(session);
  return {
    status: state.status,
    turnNumber: state.turnNumber,
    currentPosition: state.currentPosition,
    visitedCells: state.visitedCells,
    phase: state.phase,
    hypotheses: state.hypotheses.map((h) => ({
      id: h.id,
      statement: h.statement,
      status: h.status,
      timesObserved: h.timesObserved,
      hasBeenRealityChecked: h.hasBeenRealityChecked,
    })),
    discoveredPatterns: state.discoveredPatterns.map((p) => ({
      id: p.id,
      trigger: p.trigger,
      action: p.action,
      function: p.function,
      belief: p.belief,
      incomplete: isPatternIncomplete(p),
    })),
    uncoveredDomains: state.uncoveredDomains,
    finalAnswer: state.finalAnswer,
    handoffReady: Boolean(state.handoff),
  };
}

export function setDisplayTitle(session, cellId, title) {
  const state = normalizeGameSession(session);
  const text = String(title || '').trim().slice(0, 80);
  if (!cellId || !text) return state;
  return touch({
    ...state,
    displayTitles: { ...state.displayTitles, [String(cellId)]: text },
  });
}

export function setGamePhase(session, phase) {
  const state = normalizeGameSession(session);
  if (!Object.values(GAME_PHASE).includes(phase)) {
    throw new Error(`Unknown game phase: ${phase}`);
  }
  const status = phase === GAME_PHASE.MIRROR ? SESSION_STATUS.REFLECTION : state.status;
  return touch({ ...state, phase, status: state.status === SESSION_STATUS.COMPLETED ? state.status : status });
}

function emptySaturation() {
  return {
    possible: false,
    circlingOffered: false,
    readyForMirror: false,
    hardLimitReached: false,
    reasons: [],
  };
}

function normalizeSaturation(raw) {
  const base = emptySaturation();
  if (!raw || typeof raw !== 'object') return base;
  return {
    possible: Boolean(raw.possible),
    circlingOffered: Boolean(raw.circlingOffered),
    readyForMirror: Boolean(raw.readyForMirror),
    hardLimitReached: Boolean(raw.hardLimitReached),
    reasons: Array.isArray(raw.reasons) ? raw.reasons.map(String).slice(0, 12) : [],
  };
}

function resolveShownTitle(session, cell) {
  if (!cell) return null;
  return session.displayTitles?.[cell.id] || cell.title;
}

function normalizeTurn(raw) {
  return {
    turnNumber: Number(raw?.turnNumber) || 0,
    diceValue: Number(raw?.diceValue) || 0,
    fromPosition: Number.isInteger(raw?.fromPosition) ? raw.fromPosition : 0,
    toPosition: Number.isInteger(raw?.toPosition) ? raw.toPosition : 0,
    landedSlot: Number.isInteger(raw?.landedSlot) ? raw.landedSlot : null,
    cellId: raw?.cellId ? String(raw.cellId) : null,
    cellTitleShownToUser: raw?.cellTitleShownToUser ? String(raw.cellTitleShownToUser) : null,
    jump: raw?.jump && typeof raw.jump === 'object' ? raw.jump : null,
    entryAttempt: Boolean(raw?.entryAttempt),
    entrySuccess: Boolean(raw?.entrySuccess),
    overshot: Boolean(raw?.overshot),
    aiObservation: raw?.aiObservation ? String(raw.aiObservation) : null,
    aiQuestion: raw?.aiQuestion ? String(raw.aiQuestion) : null,
    userAnswer: raw?.userAnswer ? String(raw.userAnswer) : null,
    affectedHypothesisIds: Array.isArray(raw?.affectedHypothesisIds) ? raw.affectedHypothesisIds.map(String) : [],
    timestamp: typeof raw?.timestamp === 'string' ? raw.timestamp : nowIso(),
  };
}

function normalizeConversationRef(raw) {
  if (!raw || typeof raw !== 'object' || !raw.text) return null;
  return {
    role: raw.role === 'user' ? 'user' : 'assistant',
    text: String(raw.text),
    turnNumber: Number.isInteger(raw.turnNumber) ? raw.turnNumber : null,
    at: typeof raw.at === 'string' ? raw.at : null,
  };
}

function requireOpenTurn(session, { allowFailedEntry = false } = {}) {
  const turn = currentTurn(session);
  if (!turn) {
    throw new Error('No current turn');
  }
  if (turn.entryAttempt && !turn.entrySuccess && !allowFailedEntry) {
    throw new Error('Entry was not successful');
  }
  return { ...turn };
}

function replaceCurrentTurn(session, turn) {
  return { ...session, turns: replaceTurn(session.turns, turn) };
}

function replaceTurn(turns, turn) {
  const next = turns.slice();
  next[next.length - 1] = turn;
  return next;
}

function appendConversation(conversation, entry) {
  return [...conversation, { ...entry, at: nowIso() }].slice(-80);
}

function unique(list) {
  return [...new Set(list)];
}

function touch(session) {
  return { ...session, updatedAt: nowIso() };
}

export { GAME_PHASE, HYPOTHESIS_STATUS, SESSION_STATUS };
