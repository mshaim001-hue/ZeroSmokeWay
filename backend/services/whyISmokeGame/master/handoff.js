import { HANDOFF_COPY, HYPOTHESIS_STATUS } from '../constants.js';
import { normalizeGameSession } from '../session.js';
import { toPublicHypothesis } from '../hypotheses.js';
import { isPatternIncomplete } from '../patterns.js';

export function buildStage2Handoff(session) {
  const state = normalizeGameSession(session);
  const validated = state.hypotheses.filter((h) =>
    h.status === HYPOTHESIS_STATUS.SUPPORTED || (h.hasBeenRealityChecked && h.status !== HYPOTHESIS_STATUS.DISCARDED),
  );
  const quotes = collectQuotes(state);
  const functions = collectFunctions(state, validated);
  const triggers = collectTriggers(state);
  const beliefs = collectBeliefs(state, validated);

  return {
    userFinalExplanation: state.finalAnswer || '',
    initialAnswer: state.initialAnswer || '',
    finalAnswer: state.finalAnswer || '',
    validatedHypotheses: validated.map(toPublicHypothesis),
    discoveredPatterns: state.discoveredPatterns.map((p) => ({
      trigger: p.trigger,
      action: p.action,
      function: p.function,
      belief: p.belief,
      incomplete: isPatternIncomplete(p),
    })),
    beliefsToExplore: beliefs,
    functionsAttributedToSmoking: functions,
    repeatedTriggers: triggers,
    importantUserQuotes: quotes,
    transition: {
      message: HANDOFF_COPY.message,
      cta: HANDOFF_COPY.cta,
    },
    startNextStage: false,
  };
}

export function attachHandoff(session, handoff = null) {
  const state = normalizeGameSession(session);
  return {
    ...state,
    updatedAt: new Date().toISOString(),
    handoff: handoff || buildStage2Handoff(state),
  };
}

function collectQuotes(session) {
  const out = [];
  if (session.initialAnswer) out.push(session.initialAnswer);
  if (session.finalAnswer) out.push(session.finalAnswer);
  for (const turn of session.turns) {
    if (turn.userAnswer && turn.userAnswer.length > 10) out.push(turn.userAnswer);
  }
  return unique(out).slice(0, 8);
}

function collectFunctions(session, validated) {
  const fromPatterns = session.discoveredPatterns.map((p) => p.function).filter(Boolean);
  const fromHyps = validated.map((h) => h.statement);
  return unique([...fromPatterns, ...fromHyps]).slice(0, 8);
}

function collectTriggers(session) {
  return unique(session.discoveredPatterns.map((p) => p.trigger).filter(Boolean)).slice(0, 8);
}

function collectBeliefs(session, validated) {
  const fromPatterns = session.discoveredPatterns.map((p) => p.belief).filter(Boolean);
  const fromHyps = validated.map((h) => h.statement);
  return unique([...fromPatterns, ...fromHyps]).slice(0, 8);
}

function unique(list) {
  return [...new Set(list.map((item) => String(item).trim()).filter(Boolean))];
}
