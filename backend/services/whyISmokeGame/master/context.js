import { DEFAULT_INTENTION, HYPOTHESIS_STATUS } from '../constants.js';
import { getCellById, getCellBySlot } from '../definition.js';
import { isPatternIncomplete } from '../patterns.js';
import { cellVisitHistory, currentTurn, normalizeGameSession } from '../session.js';
import { toPublicHypothesis } from '../hypotheses.js';

export function buildGameMasterContext({ session, definition, userMessage = '', extra = {} } = {}) {
  const state = normalizeGameSession(session);
  const turn = currentTurn(state);
  const cell = resolveCurrentCell(definition, state, turn);
  const visit = cell ? cellVisitHistory(state, cell.id) : cellVisitHistory(state, null);

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
        visitCount: visit.count,
        previousQuestions: visit.questions,
        previousAnswers: visit.answers,
        openingQuestion: turn?.openingQuestion || turn?.aiQuestion || visit.questions[0] || '',
        thread: cellThread(state, turn),
        exchangeCount: (turn?.userAnswers || []).length,
        cellClosed: Boolean(turn?.cellClosed),
        revisit: visit.count > 1 || Boolean(turn?.revisit),
      }
      : null,
    path: state.turns
      .filter((item) => item.cellId)
      .map((item) => ({
        turnNumber: item.turnNumber,
        cellId: item.cellId,
        title: item.cellTitleShownToUser,
        revisit: Boolean(item.revisit),
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
  const cell = context.currentCell;
  return [
    `Намерение: «${context.intention}»`,
    context.initialAnswer ? `Исходный ответ: ${context.initialAnswer}` : 'Исходного ответа ещё нет. Не проси его и не комментируй отсутствие.',
    `Ход: ${context.turnNumber}. Фаза: ${context.phase}.`,
    cell
      ? `Клетка: internalName=${cell.internalName}; показано «${cell.titleShownToUser}»; посещений ${cell.visitCount}; инструкция: ${cell.aiInstruction}`
      : '',
    (!cell?.revisit && !(context.recentAnswers || []).length)
      ? 'Первый ход / мало опыта. НЕ пиши про отсутствие контекста. Название + один вопрос про конкретный эпизод.'
      : '',
    cell?.revisit
      ? `Повторное посещение. Предыдущие вопросы: ${JSON.stringify(cell.previousQuestions)}. Не повторяй их буквально. Смотри глубже в накопленный опыт.`
      : '',
    `Путь: ${context.path.map((p) => `${p.turnNumber}:${p.title || p.cellId}${p.revisit ? '*' : ''}`).join(' → ') || '—'}`,
    `Релевантные ответы:\n${context.recentAnswers.map((a) => `- ход ${a.turnNumber}: ${a.text}`).join('\n') || '—'}`,
    `Активные гипотезы: ${JSON.stringify(context.activeHypotheses)}`,
    `Противоречия: ${JSON.stringify(context.contradictions)}`,
    `Паттерны: ${JSON.stringify(context.patterns)}`,
    context.phase === 'final_reality_check'
      ? 'Сейчас системный финальный reality check, не архетип «Проверка реальностью». Один вопрос, который пытается опровергнуть ведущую гипотезу.'
      : '',
    context.event === 'user_answer' || context.event === 'follow_up'
      ? [
        'Сейчас живой диалог внутри клетки. Следующая реплика — из ПОСЛЕДНЕГО ответа, не из формы первого вопроса.',
        cell?.openingQuestion ? `Первый вопрос клетки (не повторяй его): ${cell.openingQuestion}` : '',
        cell?.thread?.length ? `Нитка этой клетки:\n${cell.thread.map((item) => `- ${item.role}: ${item.text}`).join('\n')}` : '',
        'Если тема жива — один новый вопрос из последней нитки, diceReady=false.',
        'Если поняли / исчерпали / клетка не про него / он не хочет глубже — question="", diceReady=true, короткое человеческое закрытие.',
        'Без внутреннего языка: рабочая версия, гипотеза, недостаточно данных.',
      ].filter(Boolean).join('\n')
      : '',
    context.userMessage ? `Последнее сообщение человека: ${context.userMessage}` : '',
  ].filter(Boolean).join('\n');
}

function cellThread(session, turn) {
  if (!turn) return [];
  return (session.conversation || [])
    .filter((item) => item.turnNumber === turn.turnNumber && item.text)
    .map((item) => ({ role: item.role, text: item.text }));
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
