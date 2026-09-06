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
      'Открой Рождение как тему начала: первый опыт и то, что осталось от него сегодня. Если история неизвестна, пригласи рассказать о первой сигарете. Если уже известна, развей рассказ, не спрашивая заново. Без готового вывода о человеке. ' +
      'НЕ спрашивай количество сигарет или стаж. diceReady: false.'
    );
  }

  if (move && entered) {
    let inst =
      `Ход: бросок ${move.roll}, клетка ${move.position} «${move.cell?.name}». ` +
      `Намерение: «${LILA_INTENTION}». ` +
      'Раскрой одну содержательную мысль клетки через рассказ человека, затем пригласи проверить связь. Используй открытые темы, но не повторяй отвеченные вопросы. Если символ не подходит, не навязывай его. Следующий ход уместен, когда мысль раскрыта; не превращай клетку в сбор всех недостающих сведений. ' +
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
      'Развей мысль из ответа человека, не начинай разбор клетки заново. При вопросе или поправке сначала отреагируй на них. Если остаётесь в разговоре — diceReady: false. ' +
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
