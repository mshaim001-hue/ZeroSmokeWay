/**
 * Серверная логика ходов Лилы — без допроса-анкеты.
 */

import { LILA_INTENTION, getCellInfo } from './lilaBoard.js';

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
  const t = String(text || '').trim().toLowerCase().replace(/^я\s+/, '');
  if (t === 'начать игру') return true;
  if (!t) return false;
  if (/^🎲/.test(t)) return false;
  return READINESS_SIGNALS.some((s) => t === s || t.startsWith(`${s} `) || t.startsWith(`${s},`) || t.startsWith(`${s}.`));
}

/** Текст внутри клетки; сам по себе не означает готовность к следующему броску. */
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
      'Если история неизвестна, задай один открытый вопрос о появлении первой сигареты. Если уже известна — о недавней обычной сигарете. Без перечисления возможных причин и готовой трактовки. ' +
      'НЕ спрашивай количество сигарет или стаж. diceReady: false.'
    );
  }

  if (move && entered) {
    let inst =
      `Ход: бросок ${move.roll}, клетка ${move.position} «${move.cell?.name}». ` +
      `Намерение: «${LILA_INTENTION}». ` +
      'Выбери новый ракурс из открытых тем исследования. Не задавай уже отвеченный вопрос. Если связь с клеткой слабая — не натягивай её. Если в открытой теме есть значимый пробел, задай один конкретный вопрос. Следующий ход предлагай только когда ракурс исчерпан. ' +
      'Не анкета. Не советы.';
    if (move.jump) {
      inst +=
        move.jump.type === 'arrow'
          ? ` СТРЕЛА ${move.jump.from}→${move.jump.to}: это переход на доске, а не свидетельство личного роста. Не приписывай человеку символическую причину.`
          : ` ЗМЕЯ ${move.jump.from}→${move.jump.to}: это переход на доске, а не свидетельство неудачи или скрытой печали. Не придумывай, что потянуло человека вниз.`;
    }
    inst += ' Если ждёшь рассказа — diceReady: false; если предлагаешь дальше — true.';
    return inst;
  }

  if (entered && looksLikeCellReflection(message, true)) {
    return (
      `Текущая клетка ${lilaState.position} «${getCellInfo(lilaState.position).name}». Нового броска не было. ` +
      'Ответь по смыслу сказанного. Новая история, поправка, вопрос или непонимание — продолжи разговор на этой клетке (diceReady: false). ' +
      'Если тема раскрыта или человек просит дальше — предложи бросок (diceReady: true). Не требуй ещё признаний. ' +
      'Готовый итог можно предложить, но переход к мифам выбирает человек.'
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
  if (move?.entrySuccess) return false;
  if (entered && looksLikeCellReflection(message, true)) return agentDiceReady === true;

  return agentDiceReady === true;
}
