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
