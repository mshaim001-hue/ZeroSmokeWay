/**
 * Серверная логика ходов Лилы — без допроса-анкеты.
 */

import { LILA_INTENTION } from './lilaBoard.js';

const READINESS_SIGNALS = [
  'готов',
  'готова',
  'готовы',
  'да',
  'yes',
  'ready',
  'погнали',
  'начнём',
  'начнем',
  'давай',
  'без масок',
  'согласен',
  'согласна',
  'поехали',
  'можно',
  'ок',
  'ok',
];

/** Пользователь подтвердил готовность играть (не бросок кубика). */
export function looksLikeReadinessConfirmation(text) {
  const t = String(text || '').trim().toLowerCase();
  if (!t || t.length > 120) return false;
  if (/^🎲/.test(t)) return false;
  return READINESS_SIGNALS.some((s) => t === s || t.startsWith(`${s} `) || t.startsWith(`${s},`) || t.startsWith(`${s}.`));
}

/** Ответ на вопросы по клетке — пора снова бросать (только после входа в игру). */
export function looksLikeCellReflection(text, gameEntered) {
  if (!gameEntered) return false;
  const t = String(text || '').trim();
  if (!t || /^🎲/.test(t)) return false;
  return true;
}

/**
 * Инструкция для Мастера Лилы — вместо оркестратора-анкетолога.
 * @param {{ lilaState: object, message: string, move: object|null, gameEntered: boolean }} ctx
 */
export function buildLilaInstruction({ lilaState, message, move, gameEntered }) {
  const entered = gameEntered || lilaState?.gameEntered;

  if (!entered && looksLikeReadinessConfirmation(message)) {
    return (
      'Пользователь подтвердил готовность играть без масок. ' +
      'Коротко прими (1–2 предложения, без пафоса). ' +
      'Сразу попроси бросить кубик в приложении для ВХОДА в игру — нужна шестёрка (Рождение). ' +
      'ЗАПРЕЩЕНО: спрашивать сколько курит, сколько лет, марку, возраст, имя — это НЕ Лила. ' +
      'diceReady: true.'
    );
  }

  if (move?.entryAttempt && !move.entrySuccess) {
    return (
      `Бросок на вход: ${move.roll}. Дверь закрыта — нужна 6. ` +
      'Честно скажи, что вход не состоялся. Попроси бросить снова. Без допроса. diceReady: true.'
    );
  }

  if (move?.entrySuccess) {
    return (
      `ВХОД! Выпало 6 — Рождение. Стартовая клетка ${move.position} «${move.cell?.name}». ` +
      `Намерение: «${LILA_INTENTION}». ` +
      'Разбери клетку ГЛУБОКО по формату: название клетки → что она значит для намерения → теневая сторона → 1–2 точных вопроса на осознание. ' +
      'НЕ спрашивай количество сигарет или стаж. diceReady: false.'
    );
  }

  if (move && entered) {
    let inst =
      `Ход: бросок ${move.roll}, клетка ${move.position} «${move.cell?.name}». ` +
      `Намерение: «${LILA_INTENTION}». ` +
      'Разбери клетку ГЛУБОКО: архетип → связь с тем, почему человек до сих пор курит → теневая сторона → 1–2 вопроса. ' +
      'Не анкета. Не советы.';
    if (move.jump) {
      inst +=
        move.jump.type === 'arrow'
          ? ` СТРЕЛА ${move.jump.from}→${move.jump.to}: вскрой восходящую связь.`
          : ` ЗМЕЯ ${move.jump.from}→${move.jump.to}: вскрой, что потянуло вниз.`;
    }
    inst += ' diceReady: false.';
    return inst;
  }

  if (entered && looksLikeCellReflection(message, true)) {
    return (
      'Пользователь ответил на вопросы по клетке. Кратко отрази суть его слов (1–2 предложения, без похвалы). ' +
      'Попроси бросить кубик для следующего хода. diceReady: true.'
    );
  }

  if (!entered) {
    return (
      'Игра ещё не началась. Напомни намерение «Почему я до сих пор курю?» и попроси подтвердить готовность без масок. ' +
      'Не анкета. diceReady: false.'
    );
  }

  return 'Продолжай игру Лилы по правилам. Без анкеты. diceReady: false.';
}

/** Принудительный diceReady по состоянию игры (страховка, если модель ошиблась). */
export function resolveDiceReady({ agentDiceReady, lilaState, message, move }) {
  const entered = lilaState?.gameEntered;

  if (move?.entryAttempt && !move.entrySuccess) return true;
  if (!entered && looksLikeReadinessConfirmation(message)) return true;
  if (move?.entrySuccess || (move && entered && move.roll)) return false;
  if (entered && looksLikeCellReflection(message, true)) return true;

  return Boolean(agentDiceReady);
}
