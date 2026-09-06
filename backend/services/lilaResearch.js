const FIELDS = ['knownFacts', 'rejectedHypotheses', 'openThreads', 'askedQuestions'];

export function normalizeLilaResearch(raw) {
  const result = {};
  for (const field of FIELDS) {
    result[field] = Array.isArray(raw?.[field])
      ? [...new Set(raw[field].filter(x => typeof x === 'string' && x.trim()).map(x => x.trim().slice(0, 800)))].slice(-20)
      : [];
  }
  result.lastAngle = typeof raw?.lastAngle === 'string' ? raw.lastAngle.trim().slice(0, 800) : '';
  return result;
}

export function updateLilaResearch(prior, incoming) {
  const before = normalizeLilaResearch(prior);
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return before;
  const next = normalizeLilaResearch({ ...before, ...incoming });
  // These are a record of the conversation, not a replaceable hypothesis list.
  for (const field of ['rejectedHypotheses', 'askedQuestions']) {
    next[field] = [...new Set([...before[field], ...next[field]])].slice(-20);
  }
  return next;
}
