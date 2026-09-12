import { DEFAULT_INTENTION, HYPOTHESIS_STATUS } from '../constants.js';
import { getCellById, getCellBySlot } from '../definition.js';
import { isPatternIncomplete } from '../patterns.js';
import { currentTurn, normalizeGameSession } from '../session.js';
import { toPublicHypothesis } from '../hypotheses.js';

export function buildGameMasterContext({ session, definition, userMessage = '', extra = {} } = {}) {
  const state = normalizeGameSession(session);
  const turn = currentTurn(state);
  const cell = resolveCurrentCell(definition, state, turn);

  return {
    intention: state.initialIntention || definition?.intention || DEFAULT_INTENTION,
    initialAnswer: state.initialAnswer || '',
    turnNumber: state.turnNumber,
    phase: state.phase,
    status: state.status,
    currentCell: cell
      ? {
        id: cell.id,
        internalName: cell.internalName || cell.id,
        defaultTitle: cell.title,
        titleShownToUser: turn?.cellTitleShownToUser || state.displayTitles[cell.id] || cell.title,
        aiInstruction: cell.aiInstruction || '',
      }
      : null,
    path: state.turns
      .filter((item) => item.cellId)
      .map((item) => ({
        turnNumber: item.turnNumber,
        cellId: item.cellId,
        title: item.cellTitleShownToUser,
        jump: item.jump,
      })),
    recentAnswers: relevantAnswers(state),
    activeHypotheses: state.hypotheses
      .filter((h) => h.status === HYPOTHESIS_STATUS.CANDIDATE || h.status === HYPOTHESIS_STATUS.SUPPORTED || h.status === HYPOTHESIS_STATUS.WEAKENED)
      .map(toPublicHypothesis),
    contradictions: collectContradictions(state),
    patterns: state.discoveredPatterns.map((p) => ({
      id: p.id,
      trigger: p.trigger,
      action: p.action,
      function: p.function,
      belief: p.belief,
      incomplete: isPatternIncomplete(p),
    })),
    visitedCells: state.visitedCells,
    userMessage: String(userMessage || ''),
    ...extra,
  };
}

export function formatGameMasterContext(context) {
  return [
    `Намерение: «${context.intention}»`,
    `Исходный ответ: ${context.initialAnswer || '—'}`,
    `Ход: ${context.turnNumber}. Фаза: ${context.phase}.`,
    context.currentCell
      ? `Клетка: internalName=${context.currentCell.internalName}; показано «${context.currentCell.titleShownToUser}»; инструкция: ${context.currentCell.aiInstruction}`
      : 'Клетки ещё нет — вход не состоялся или зеркало.',
    `Путь: ${context.path.map((p) => `${p.turnNumber}:${p.title || p.cellId}`).join(' → ') || '—'}`,
    `Релевантные ответы:\n${context.recentAnswers.map((a) => `- ход ${a.turnNumber}: ${a.text}`).join('\n') || '—'}`,
    `Активные гипотезы: ${JSON.stringify(context.activeHypotheses)}`,
    `Противоречия: ${JSON.stringify(context.contradictions)}`,
    `Паттерны: ${JSON.stringify(context.patterns)}`,
    context.userMessage ? `Последнее сообщение человека: ${context.userMessage}` : '',
  ].filter(Boolean).join('\n');
}

function resolveCurrentCell(definition, session, turn) {
  if (!definition) return null;
  if (turn?.cellId) return getCellById(definition, turn.cellId);
  if (session.currentPosition > 0) return getCellBySlot(definition, session.currentPosition);
  return null;
}

function relevantAnswers(session) {
  return session.turns
    .filter((turn) => turn.userAnswer)
    .slice(-8)
    .map((turn) => ({
      turnNumber: turn.turnNumber,
      cellId: turn.cellId,
      cellTitle: turn.cellTitleShownToUser,
      question: turn.aiQuestion,
      text: turn.userAnswer,
    }));
}

function collectContradictions(session) {
  const out = [];
  for (const hyp of session.hypotheses) {
    if (hyp.counterEvidence?.length && hyp.evidence?.length) {
      out.push({
        hypothesisId: hyp.id,
        statement: hyp.statement,
        evidence: hyp.evidence.map((item) => item.text),
        counterEvidence: hyp.counterEvidence.map((item) => item.text),
      });
    }
    if (hyp.status === HYPOTHESIS_STATUS.CONTRADICTED || hyp.status === HYPOTHESIS_STATUS.WEAKENED) {
      out.push({
        hypothesisId: hyp.id,
        statement: hyp.statement,
        status: hyp.status,
      });
    }
  }
  return out.slice(0, 12);
}
