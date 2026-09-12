import { GAME_PHASE, HYPOTHESIS_ACTION, HYPOTHESIS_STATUS } from '../constants.js';
import { getCellById } from '../definition.js';
import {
  addSessionHypothesis,
  addDiscoveredPattern,
  addUncoveredDomain,
  currentTurn,
  normalizeGameSession,
  recordNarration,
  setDisplayTitle,
  setGamePhase,
  updateSessionHypothesis,
} from '../session.js';
import { composeMasterMessage, normalizeGameMasterResult } from './result.js';
import { evaluateSaturation, leadingHypothesisHeld } from './saturation.js';
import { lastPersonalizedTurnNumber, resolvePersonalizedTitle } from './titles.js';

export function applyGameMasterResult(session, definition, rawResult, { userMessage = '' } = {}) {
  let state = normalizeGameSession(session);
  const result = normalizeGameMasterResult(rawResult);
  const turn = currentTurn(state);

  for (const update of result.hypothesisUpdates) {
    state = applyHypothesisUpdate(state, update);
  }
  for (const pattern of result.patterns) {
    state = addDiscoveredPattern(state, pattern);
  }
  for (const domain of result.uncoveredDomains) {
    state = addUncoveredDomain(state, domain);
  }

  if (result.userRecognizesHypothesis) {
    const target = pickRecognizedId(state, result);
    if (target && !state.userRecognizedHypothesisIds.includes(target)) {
      state = {
        ...state,
        userRecognizedHypothesisIds: [...state.userRecognizedHypothesisIds, target],
      };
      if (state.hypotheses.some((h) => h.id === target)) {
        state = updateSessionHypothesis(state, target, { realityChecked: true, status: HYPOTHESIS_STATUS.SUPPORTED });
      }
    }
  }

  const cell = turn?.cellId && definition ? getCellById(definition, turn.cellId) : null;
  const recentAnswers = [
    ...state.turns.filter((item) => item.userAnswer).map((item) => ({ text: item.userAnswer })),
    userMessage ? { text: userMessage } : null,
  ].filter(Boolean);
  const personalized = resolvePersonalizedTitle({
    cell,
    proposed: result.displayTitle,
    recentAnswers,
    lastPersonalizedTurn: lastPersonalizedTurnNumber(state),
    turnNumber: state.turnNumber,
  });
  if (personalized && cell) {
    state = setDisplayTitle(state, cell.id, personalized);
    if (turn) {
      const turns = state.turns.slice();
      turns[turns.length - 1] = { ...turns[turns.length - 1], cellTitleShownToUser: personalized };
      state = { ...state, turns };
    }
  }

  const message = composeMasterMessage(result);
  if (message) {
    state = recordNarration(state, { observation: result.observation || message, question: result.question });
  }

  const saturation = evaluateSaturation(state, {
    aiPossible: result.possibleSaturation,
    userRecognizes: result.userRecognizesHypothesis,
  });
  state = {
    ...state,
    saturation: {
      possible: saturation.possible,
      circlingOffered: state.saturation.circlingOffered || saturation.shouldOfferCircling || result.shouldRealityCheck,
      readyForMirror: saturation.readyForMirror,
      hardLimitReached: saturation.hardLimitReached,
      reasons: saturation.reasons,
    },
  };

  if (state.status !== 'completed') {
    state = advancePhase(state, result, saturation);
  }

  const canRoll = state.phase === GAME_PHASE.PLAYING
    && state.status === 'active'
    && Boolean(currentTurn(state)?.userAnswer || !currentTurn(state)?.cellId);

  return {
    session: state,
    result,
    message,
    saturation,
    diceReady: canRoll,
  };
}

function advancePhase(state, result, saturation) {
  if (state.phase === GAME_PHASE.FINAL_REALITY_CHECK && state.finalRealityCheckPending) {
    const resolved = { ...state, finalRealityCheckPending: false };
    if (saturation.hardLimitReached || leadingHypothesisHeld(resolved, result)) {
      return setGamePhase(resolved, GAME_PHASE.MIRROR);
    }
    return setGamePhase(resolved, GAME_PHASE.PLAYING);
  }

  const turnAnswered = Boolean(currentTurn(state)?.userAnswer);
  if (
    state.phase === GAME_PHASE.PLAYING
    && turnAnswered
    && (result.shouldRealityCheck || saturation.shouldFinalRealityCheck)
  ) {
    return setGamePhase({ ...state, finalRealityCheckPending: true }, GAME_PHASE.FINAL_REALITY_CHECK);
  }
  return state;
}

function applyHypothesisUpdate(session, update) {
  if (update.action === HYPOTHESIS_ACTION.CREATE) {
    return addSessionHypothesis(session, { statement: update.statement });
  }

  const id = update.hypothesisId || inferLatestHypothesisId(session);
  if (!id) return session;

  if (update.action === HYPOTHESIS_ACTION.ADD_EVIDENCE) {
    return updateSessionHypothesis(session, id, { evidence: update.text || update.statement });
  }
  if (update.action === HYPOTHESIS_ACTION.ADD_COUNTER_EVIDENCE) {
    return updateSessionHypothesis(session, id, { counterEvidence: update.text || update.statement });
  }
  if (update.action === HYPOTHESIS_ACTION.WEAKEN) {
    return updateSessionHypothesis(session, id, {
      counterEvidence: update.text,
      status: HYPOTHESIS_STATUS.WEAKENED,
    });
  }
  if (update.action === HYPOTHESIS_ACTION.DISCARD) {
    return updateSessionHypothesis(session, id, {
      counterEvidence: update.text,
      status: HYPOTHESIS_STATUS.DISCARDED,
    });
  }
  if (update.action === HYPOTHESIS_ACTION.SUPPORT) {
    return updateSessionHypothesis(session, id, {
      evidence: update.text,
      status: HYPOTHESIS_STATUS.SUPPORTED,
    });
  }
  if (update.action === HYPOTHESIS_ACTION.REALITY_CHECK) {
    return updateSessionHypothesis(session, id, {
      realityChecked: true,
      status: update.recognized ? HYPOTHESIS_STATUS.SUPPORTED : undefined,
    });
  }
  return session;
}

function inferLatestHypothesisId(session) {
  return session.hypotheses[session.hypotheses.length - 1]?.id ?? null;
}

function pickRecognizedId(session, result) {
  const fromUpdate = result.hypothesisUpdates.find((item) => item.hypothesisId && (item.action === HYPOTHESIS_ACTION.REALITY_CHECK || item.action === HYPOTHESIS_ACTION.SUPPORT));
  return fromUpdate?.hypothesisId || session.hypotheses.find((h) => h.status === HYPOTHESIS_STATUS.SUPPORTED)?.id || inferLatestHypothesisId(session);
}
