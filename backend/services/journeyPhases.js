/**
 * Фазы пути: исследование → Карр → обещание → поддержка.
 * Маршрутизация — в journeyPipeline.js (без GPT-оркестратора).
 */
export const PHASES = {
  WELCOME: 'welcome',
  ANAMNESIS: 'anamnesis',
  MYTH_BUSTING: 'myth_busting',
  SUPPORT: 'support',
};

/** @param {string} ph */
export function isLilaPhase(ph) {
  return ph === PHASES.WELCOME || ph === PHASES.ANAMNESIS;
}
