import { HYPOTHESIS_ACTION } from '../constants.js';

const ACTIONS = new Set(Object.values(HYPOTHESIS_ACTION));

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
