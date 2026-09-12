import { GAME_PHASE, HYPOTHESIS_STATUS, SATURATION } from '../constants.js';
import { normalizeGameSession } from '../session.js';

export function evaluateSaturation(session, { aiPossible = false, userRecognizes = false } = {}) {
  const state = normalizeGameSession(session);
  const answeredTurns = state.turns.filter((turn) => turn.userAnswer && turn.cellId);
  const turnCount = answeredTurns.length;
  const hardLimitReached = turnCount >= SATURATION.HARD_LIMIT_TURNS;
  const stable = stableHypotheses(state);
  const keyChecked = stable.some((h) => h.hasBeenRealityChecked);
  const recognized = userRecognizes
    || state.userRecognizedHypothesisIds.some((id) => stable.some((h) => h.id === id))
    || stable.some((h) => h.hasBeenRealityChecked && h.status === HYPOTHESIS_STATUS.SUPPORTED);
  const repeating = lastTurnsRepeat(answeredTurns);
  const enoughTurns = turnCount >= SATURATION.SOFT_HINT_TURNS || aiPossible || hardLimitReached;

  const reasons = [];
  if (stable.length >= SATURATION.MIN_STABLE && stable.length <= SATURATION.MAX_STABLE) {
    reasons.push('stable_hypotheses');
  }
  if (keyChecked) reasons.push('reality_checked');
  if (recognized) reasons.push('user_recognizes');
  if (repeating) reasons.push('repeating_turns');
  if (hardLimitReached) reasons.push('hard_limit');

  const materialReady = stable.length >= SATURATION.MIN_STABLE
    && stable.length <= SATURATION.MAX_STABLE
    && hasMultipleEpisodes(stable)
    && keyChecked
    && recognized
    && repeating;

  const possible = (materialReady && enoughTurns) || (hardLimitReached && stable.length >= SATURATION.MIN_STABLE);
  const readyForMirror = (materialReady && keyChecked && recognized)
    || (hardLimitReached && state.phase === GAME_PHASE.REALITY_CHECK && (recognized || keyChecked))
    || (hardLimitReached && state.saturation.circlingOffered && state.phase === GAME_PHASE.REALITY_CHECK);

  const shouldOfferCircling = possible
    && !readyForMirror
    && !state.saturation.circlingOffered
    && state.phase === GAME_PHASE.PLAY;

  const shouldRealityCheck = (possible || state.phase === GAME_PHASE.CIRCLING)
    && !readyForMirror
    && (state.phase === GAME_PHASE.CIRCLING || state.saturation.circlingOffered)
    && state.phase !== GAME_PHASE.MIRROR;

  return {
    possible,
    readyForMirror,
    shouldOfferCircling,
    shouldRealityCheck,
    hardLimitReached,
    turnCount,
    stableHypotheses: stable.map((h) => h.id),
    reasons,
  };
}

export function stableHypotheses(session) {
  return (session.hypotheses || []).filter((h) => {
    if (h.status !== HYPOTHESIS_STATUS.SUPPORTED && h.status !== HYPOTHESIS_STATUS.CANDIDATE) return false;
    if (h.status === HYPOTHESIS_STATUS.CANDIDATE && !h.hasBeenRealityChecked) return false;
    const episodes = new Set(
      [...(h.evidence || []), ...(h.counterEvidence || [])]
        .map((item) => item.turnNumber)
        .filter((n) => Number.isInteger(n)),
    );
    if (h.evidence?.length) episodes.add('named');
    return h.timesObserved >= SATURATION.MIN_EVIDENCE_EPISODES || episodes.size >= SATURATION.MIN_EVIDENCE_EPISODES;
  }).slice(0, SATURATION.MAX_STABLE);
}

function hasMultipleEpisodes(hypotheses) {
  return hypotheses.some((h) => {
    const turns = new Set((h.evidence || []).map((item) => item.turnNumber).filter((n) => Number.isInteger(n)));
    return turns.size >= SATURATION.MIN_EVIDENCE_EPISODES || h.timesObserved >= SATURATION.MIN_EVIDENCE_EPISODES;
  });
}

function lastTurnsRepeat(answeredTurns) {
  const window = answeredTurns.slice(-SATURATION.REPEAT_WINDOW);
  if (window.length < SATURATION.REPEAT_WINDOW) return false;
  const ids = window.map((turn) => [...(turn.affectedHypothesisIds || [])].sort().join(','));
  const sameIds = ids[0] && ids.every((id) => id === ids[0]);
  const texts = window.map((turn) => normalizeRepeatText(turn.userAnswer));
  const sameText = texts[0] && texts.every((text) => text === texts[0] || looksLikeRepeat(text));
  return sameIds || sameText;
}

function normalizeRepeatText(text) {
  return String(text || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function looksLikeRepeat(text) {
  return /уже (говорили|обсуждали|было)|то же самое|снова то же|мы это уже/.test(text);
}
