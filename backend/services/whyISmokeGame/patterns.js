import { createId, nowIso } from './ids.js';

export function createPattern({
  trigger = null,
  action = null,
  fn = null,
  function: functionAlias = null,
  belief = null,
  sourceTurnNumbers = [],
  id,
} = {}) {
  const func = clean(fn ?? functionAlias);
  return {
    id: id || createId('pat'),
    trigger: clean(trigger),
    action: clean(action),
    function: func,
    belief: clean(belief),
    sourceTurnNumbers: Array.isArray(sourceTurnNumbers)
      ? sourceTurnNumbers.filter((n) => Number.isInteger(n))
      : [],
    createdAt: nowIso(),
  };
}

export function isPatternIncomplete(pattern) {
  return !pattern.trigger || !pattern.action || !pattern.function || !pattern.belief;
}

export function normalizePattern(raw) {
  return createPattern(raw && typeof raw === 'object' ? raw : {});
}

function clean(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim().slice(0, 400);
  return text || null;
}
