import { HYPOTHESIS_STATUS } from './constants.js';
import { createId, nowIso } from './ids.js';

const STATUSES = new Set(Object.values(HYPOTHESIS_STATUS));

export function createHypothesis({
  statement,
  status = HYPOTHESIS_STATUS.CANDIDATE,
  evidence = [],
  counterEvidence = [],
  confidence = 0.3,
  timesObserved = 0,
  hasBeenRealityChecked = false,
  id,
} = {}) {
  const text = String(statement || '').trim();
  if (!text) {
    throw new Error('Hypothesis.statement is required');
  }

  return {
    id: id || createId('hyp'),
    statement: text.slice(0, 500),
    status: STATUSES.has(status) ? status : HYPOTHESIS_STATUS.CANDIDATE,
    evidence: normalizeNotes(evidence),
    counterEvidence: normalizeNotes(counterEvidence),
    confidence: clampConfidence(confidence),
    timesObserved: Math.max(0, Number(timesObserved) || 0),
    hasBeenRealityChecked: Boolean(hasBeenRealityChecked),
  };
}

export function normalizeHypothesis(raw) {
  return createHypothesis(raw && typeof raw === 'object' ? raw : { statement: '—' });
}

/** Пользовательский вид: без процентов и без внутреннего confidence. */
export function toPublicHypothesis(hypothesis) {
  const h = normalizeHypothesis(hypothesis);
  return {
    id: h.id,
    statement: h.statement,
    status: h.status,
    evidence: h.evidence.map((item) => item.text),
    counterEvidence: h.counterEvidence.map((item) => item.text),
    timesObserved: h.timesObserved,
    hasBeenRealityChecked: h.hasBeenRealityChecked,
  };
}

export function addHypothesisEvidence(hypothesis, text, { counter = false, turnNumber = null } = {}) {
  const next = normalizeHypothesis(hypothesis);
  const note = { text: String(text || '').trim().slice(0, 400), turnNumber, at: nowIso() };
  if (!note.text) return next;
  if (counter) next.counterEvidence = [...next.counterEvidence, note].slice(-12);
  else next.evidence = [...next.evidence, note].slice(-12);
  next.timesObserved += 1;
  return next;
}

export function setHypothesisStatus(hypothesis, status, { realityChecked = false } = {}) {
  if (!STATUSES.has(status)) {
    throw new Error(`Unknown hypothesis status: ${status}`);
  }
  const next = normalizeHypothesis(hypothesis);
  next.status = status;
  if (realityChecked || status === HYPOTHESIS_STATUS.SUPPORTED || status === HYPOTHESIS_STATUS.CONTRADICTED) {
    next.hasBeenRealityChecked = true;
  }
  if (status === HYPOTHESIS_STATUS.SUPPORTED) {
    next.confidence = Math.min(0.9, next.confidence + 0.15);
  } else if (status === HYPOTHESIS_STATUS.WEAKENED) {
    next.confidence = Math.max(0.08, next.confidence - 0.2);
  } else if (status === HYPOTHESIS_STATUS.CONTRADICTED || status === HYPOTHESIS_STATUS.DISCARDED) {
    next.confidence = Math.max(0.05, next.confidence - 0.2);
  }
  return next;
}

export function weakenHypothesis(hypothesis, text, { turnNumber = null } = {}) {
  let next = hypothesis;
  if (text) {
    next = addHypothesisEvidence(next, text, { counter: true, turnNumber });
  } else {
    next = normalizeHypothesis(next);
  }
  if (next.status !== HYPOTHESIS_STATUS.DISCARDED) {
    next.status = HYPOTHESIS_STATUS.WEAKENED;
  }
  next.confidence = Math.max(0.08, next.confidence - 0.25);
  return next;
}

function normalizeNotes(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string' && item.trim()) {
        return { text: item.trim().slice(0, 400), turnNumber: null, at: null };
      }
      if (item && typeof item === 'object' && typeof item.text === 'string' && item.text.trim()) {
        return {
          text: item.text.trim().slice(0, 400),
          turnNumber: Number.isInteger(item.turnNumber) ? item.turnNumber : null,
          at: typeof item.at === 'string' ? item.at : null,
        };
      }
      return null;
    })
    .filter(Boolean)
    .slice(-12);
}

function clampConfidence(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.3;
  return Math.min(0.95, Math.max(0.05, n));
}
