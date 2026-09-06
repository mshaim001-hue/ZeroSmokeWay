export const LILA_FINISH_MESSAGE = 'Перейти к разбору мифов';

export function normalizeJourneySummary(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function acceptsLilaSummary(message, anamnesis) {
  return message.trim() === LILA_FINISH_MESSAGE &&
    Boolean(normalizeJourneySummary(anamnesis?.lilaJourneySummary));
}

export function updateLilaSummary(anamnesis, summary) {
  return { ...anamnesis, lilaJourneySummary: normalizeJourneySummary(summary) };
}

// Evidence must come from the person, never from the narrator's own interpretation.
// The semantic assessment remains model supplied; this checks its required evidence.
export function validateLilaSummary(summary, check, userMessages) {
  if (!normalizeJourneySummary(summary)) return null;
  const normalize = value => String(value).replace(/\s+/g, ' ').trim().toLowerCase();
  const sources = userMessages.map(normalize);
  const evidence = check?.currentEvidence;
  if (check?.contradictionsReviewed !== true || check?.hasBlockingUnknowns !== false ||
      !Array.isArray(evidence) || evidence.length === 0 ||
      !evidence.every(quote => typeof quote === 'string' && normalize(quote).length >= 12 &&
        sources.some(source => source.includes(normalize(quote))))) return null;
  return normalizeJourneySummary(summary);
}
