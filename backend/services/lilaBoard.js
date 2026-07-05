/**
 * Классическая доска Лилы: 72 клетки, стрелы (восходящий поток) и змеи (нисходящий).
 * Позиция считается на сервере — модель не «угадывает» клетку.
 */

/** @type {Record<number, number>} стрела: from → to (вверх) */
export const LILA_ARROWS = {
  10: 23,
  14: 27,
  17: 69,
  18: 31,
  24: 42,
  28: 51,
  37: 54,
  48: 65,
  49: 61,
  53: 72,
  59: 68,
};

/** @type {Record<number, number>} змея: from → to (вниз) */
export const LILA_SNAKES = {
  6: 1,
  11: 8,
  16: 3,
  25: 22,
  26: 13,
  33: 19,
  40: 35,
  41: 20,
  44: 15,
  47: 28,
  52: 32,
  54: 36,
  56: 46,
  63: 55,
  71: 57,
};

/** Архетипические названия клеток (1–72) */
export const LILA_CELL_NAMES = [
  '',
  'Рождение',
  'Майя',
  'Гнев',
  'Жадность',
  'Иллюзия',
  'Тщеславие',
  'Невежество',
  'Печаль',
  'Страх',
  'Отчаяние',
  'Жажда',
  'Привязанность',
  'Зависть',
  'Гордыня',
  'Ложь',
  'Лень',
  'Сомнение',
  'Вина',
  'Стыд',
  'Обида',
  'Одиночество',
  'Скука',
  'Тревога',
  'Контроль',
  'Бегство',
  'Маска',
  'Защита',
  'Ритуал',
  'Привычка',
  'Компульсия',
  'Зависимость',
  'Плен',
  'Отрицание',
  'Рационализация',
  'Оправдание',
  'Самообман',
  'Тень',
  'Подавление',
  'Проекция',
  'Разделение',
  'Страдание',
  'Цепь',
  'Клетка',
  'Петля',
  'Ловушка',
  'Иллюзия облегчения',
  'Ложная опора',
  'Мнимая свобода',
  'Страх потери',
  'Привязанность к яду',
  'Рабство',
  'Пробуждение',
  'Осознание',
  'Первый взгляд',
  'Узнавание',
  'Принятие',
  'Смелость',
  'Честность',
  'Уязвимость',
  'Истина',
  'Ясность',
  'Различение',
  'Понимание',
  'Инсайт',
  'Освобождение',
  'Прощение',
  'Отпускание',
  'Пустота',
  'Тишина',
  'Присутствие',
  'Целостность',
  'Свобода',
  'Радость',
  'Любовь',
  'Единство',
  'Просветление',
];

export const LILA_INTENTION = 'Почему я до сих пор курю?';

export function emptyLilaState() {
  return {
    position: 0,
    gameEntered: false,
    visitedCells: [],
  };
}

export function normalizeLilaState(raw) {
  const base = emptyLilaState();
  if (!raw || typeof raw !== 'object') return base;
  const position = Number.isFinite(Number(raw.position)) ? Math.max(0, Math.min(72, Number(raw.position))) : 0;
  const gameEntered = Boolean(raw.gameEntered);
  const visitedCells = Array.isArray(raw.visitedCells)
    ? [...new Set(raw.visitedCells.map(Number).filter((n) => n >= 1 && n <= 72))]
    : [];
  return { position, gameEntered, visitedCells };
}

/**
 * @param {object} state
 * @param {number} roll 1–6
 */
export function applyLilaMove(state, roll) {
  const s = normalizeLilaState(state);
  const r = Math.min(6, Math.max(1, Number(roll) || 1));
  const result = {
    ...s,
    roll: r,
    entryAttempt: false,
    entrySuccess: false,
    jump: null,
    cell: null,
    overshot: false,
  };

  if (!s.gameEntered) {
    result.entryAttempt = true;
    if (r !== 6) {
      result.cell = getCellInfo(0);
      return result;
    }
    result.entrySuccess = true;
    result.gameEntered = true;
    result.position = 1;
    result.cell = getCellInfo(1);
    result.visitedCells = uniqueVisited(s.visitedCells, 1);
    return result;
  }

  let next = s.position + r;
  if (next > 72) {
    result.overshot = true;
    next = 72 - (next - 72);
    if (next < 1) next = 1;
  }

  result.position = next;
  result.cell = getCellInfo(next);

  if (LILA_ARROWS[next]) {
    const to = LILA_ARROWS[next];
    result.jump = { type: 'arrow', from: next, to };
    result.position = to;
    result.cell = getCellInfo(to);
  } else if (LILA_SNAKES[next]) {
    const to = LILA_SNAKES[next];
    result.jump = { type: 'snake', from: next, to };
    result.position = to;
    result.cell = getCellInfo(to);
  }

  result.visitedCells = uniqueVisited(s.visitedCells, result.position);
  return result;
}

function uniqueVisited(list, cell) {
  const out = [...list];
  if (cell >= 1 && cell <= 72 && !out.includes(cell)) out.push(cell);
  return out;
}

export function getCellInfo(position) {
  const p = Number(position) || 0;
  if (p < 1 || p > 72) {
    return {
      number: 0,
      name: 'Вне доски',
      hasArrow: false,
      hasSnake: false,
    };
  }
  return {
    number: p,
    name: LILA_CELL_NAMES[p] || `Клетка ${p}`,
    hasArrow: Boolean(LILA_ARROWS[p]),
    hasSnake: Boolean(LILA_SNAKES[p]),
    arrowTo: LILA_ARROWS[p] ?? null,
    snakeTo: LILA_SNAKES[p] ?? null,
  };
}

export function formatLilaMoveForAgent(move) {
  if (!move) return '';
  const lines = [
    `=== ХОД НА ДОСКЕ ЛИЛЫ (сервер) ===`,
    `Намерение игры: «${LILA_INTENTION}»`,
    `Бросок: ${move.roll}`,
  ];

  if (move.entryAttempt && !move.entrySuccess) {
    lines.push(`Вход не состоялся — выпало ${move.roll}, нужна 6 (Рождение). Позиция: вне доски.`);
    return lines.join('\n');
  }

  if (move.entrySuccess) {
    lines.push(`Вход в игру! Шестёрка — символ Рождения. Стартовая клетка: 1 «${move.cell?.name}».`);
    return lines.join('\n');
  }

  if (move.overshot) {
    lines.push(`Переброс — отражение от финиша.`);
  }

  lines.push(`Клетка: ${move.position} «${move.cell?.name}»`);

  if (move.jump?.type === 'arrow') {
    const toName = LILA_CELL_NAMES[move.jump.to] || move.jump.to;
    lines.push(
      `СТРЕЛА (восходящий поток): ${move.jump.from} → ${move.jump.to} «${toName}». ` +
        `Вскрой связь между этими клетками через намерение «${LILA_INTENTION}».`,
    );
  } else if (move.jump?.type === 'snake') {
    const toName = LILA_CELL_NAMES[move.jump.to] || move.jump.to;
    lines.push(
      `ЗМЕЯ (нисходящий поток): ${move.jump.from} → ${move.jump.to} «${toName}». ` +
        `Вскрой, что потянуло вниз — через намерение «${LILA_INTENTION}».`,
    );
  }

  if (move.visitedCells?.length) {
    lines.push(`Уже посещённые клетки: ${move.visitedCells.join(', ')}. Не повторяй разбор пройденного.`);
  }

  return lines.join('\n');
}
