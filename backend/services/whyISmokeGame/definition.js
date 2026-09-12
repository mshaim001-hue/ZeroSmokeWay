import { DEFAULT_INTENTION, GAME_ID, LINK_TYPE, OVERSHOOT } from './constants.js';

const DEFAULT_CELLS = [
  ['birth', 'Рождение', 'Исследуй начало: как появилась первая сигарета и что от этого осталось сегодня. Не ставь диагноз.'],
  ['first_cigarette', 'Первая сигарета', 'Проверь конкретный первый эпизод. Если его нет — это нормальный пробел.'],
  ['habit', 'Привычка', 'Ищи повтор без мысли. Не путай привычку с единственной причиной.'],
  ['pause', 'Пауза', 'Проверь, склеилась ли сигарета с перерывом. Если пауза бывала без неё — гипотеза слабеет.'],
  ['ritual', 'Ритуал', 'Смотри на цепочку действий вокруг сигареты, не на символ клетки как вердикт.'],
  ['company', 'Компания', 'Проверь социальный контекст. Если человек курит и один — не натягивай компанию.'],
  ['stress', 'Стресс', 'Заметь ожидаемый эффект «станет спокойнее». Не утверждай, что сигарета решает стресс.'],
  ['boredom', 'Скука', 'Проверь, появляется ли сигарета от пустоты. Если нет — смени ракурс.'],
  ['reward', 'Награда', 'Гипотеза: сигарета как разрешение после задачи. Проверь и попытайся опровергнуть.'],
  ['automaton', 'Автомат', 'Ищи движение «руки сами». Не строй новый автомат и не учи менять привычку.'],
  ['morning', 'Утро', 'Отдели утреннюю сигарету от вечерней. Это могут быть разные линии.'],
  ['work', 'Работа', 'Связь с окончанием задачи или сменой контекста. Только если это уже есть в словах.'],
  ['aloneness', 'Одиночество', 'Проверь, нужна ли сигарета, чтобы побыть одному. Несогласие — валидный исход.'],
  ['return', 'Возврат', 'История возврата после паузы — отдельный предмет, не замена сегодняшнему курению.'],
  ['exception', 'Исключение', 'Ищи мысль «одна ничего не изменит». Не объявляй её причиной всего.'],
  ['excuse', 'Оправдание', 'Как человек сам себе объясняет сигарету. Это гипотеза, не приговор.'],
  ['loss_fear', 'Страх потери', 'Проверь страх «потерять что-то без сигареты». Если не узнаёт — сними гипотезу.'],
  ['identity', 'Идентичность', 'Курение как часть «кто я». Опровергай, если человек уже был собой без сигарет.'],
  ['contradiction', 'Противоречие', 'Сопоставь две его фразы. Покажи разрыв, не интерпретируй как самообман.'],
  ['repeat', 'Повтор', 'Сложи путь клеток и ответов: что возвращается. Одна осторожная гипотеза.'],
  ['recognition', 'Узнавание', 'Проверь, узнаёт ли человек свою мысль или ты додумываешь.'],
  ['distinction', 'Различение', 'Помоги отделить разные ситуации друг от друга. Не своди всё к одной причине.'],
  ['structure', 'Устройство', 'Собери рабочую картину: когда, что делает, какой эффект замечает сам человек.'],
  ['clarity', 'Ясность', 'Если картина узнаваема — можно предложить итог. Это не диагноз и не план отказа.'],
];

const DEFAULT_LINKS = [
  { type: LINK_TYPE.ARROW, fromSlot: 4, toSlot: 12 },
  { type: LINK_TYPE.ARROW, fromSlot: 10, toSlot: 19 },
  { type: LINK_TYPE.SNAKE, fromSlot: 16, toSlot: 8 },
  { type: LINK_TYPE.SNAKE, fromSlot: 17, toSlot: 7 },
];

export function createCell({ id, slot, title, aiInstruction = '', internalName } = {}) {
  const cellId = String(id);
  return {
    id: cellId,
    internalName: String(internalName || cellId),
    slot: Number(slot),
    title: String(title),
    aiInstruction: String(aiInstruction || ''),
  };
}

export function createDefinition(raw = {}) {
  const slotCount = Number.isInteger(raw.slotCount) ? raw.slotCount : (raw.board?.slotCount ?? 24);
  const rawCells = raw.cells ?? raw.board?.cells;
  const cells = Array.isArray(rawCells)
    ? rawCells.map((cell, index) => createCell({
      id: cell.id,
      internalName: cell.internalName,
      slot: cell.slot ?? index + 1,
      title: cell.title,
      aiInstruction: cell.aiInstruction,
    }))
    : DEFAULT_CELLS.map(([id, title, aiInstruction], index) => createCell({
      id,
      slot: index + 1,
      title,
      aiInstruction,
    }));

  const links = Array.isArray(raw.links) ? raw.links : (raw.board?.links ?? DEFAULT_LINKS);

  return normalizeGameDefinition({
    id: raw.id ?? GAME_ID,
    version: raw.version ?? 1,
    title: raw.title ?? 'Почему я до сих пор курю',
    intention: raw.intention ?? DEFAULT_INTENTION,
    dice: raw.dice,
    entryRoll: raw.entryRoll,
    board: {
      slotCount,
      overshoot: raw.overshoot ?? raw.board?.overshoot,
      cells,
      links,
    },
    narratorRules: raw.narratorRules,
  });
}

export function normalizeGameDefinition(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('GameDefinition is required');
  }

  const board = raw.board && typeof raw.board === 'object' ? raw.board : {};
  const slotCount = Number(board.slotCount ?? raw.slotCount);
  if (!Number.isInteger(slotCount) || slotCount < 2) {
    throw new Error('GameDefinition.board.slotCount must be an integer >= 2');
  }

  const diceMax = Number(raw.dice?.max ?? 6);
  const diceMin = Number(raw.dice?.min ?? 1);
  if (!Number.isInteger(diceMin) || !Number.isInteger(diceMax) || diceMin < 1 || diceMax < diceMin) {
    throw new Error('GameDefinition.dice must be a valid integer range');
  }

  const entryRoll = Number(raw.entryRoll ?? diceMax);
  if (!Number.isInteger(entryRoll) || entryRoll < diceMin || entryRoll > diceMax) {
    throw new Error('GameDefinition.entryRoll must be within dice range');
  }

  const overshoot = board.overshoot === OVERSHOOT.STAY ? OVERSHOOT.STAY : OVERSHOOT.BOUNCE;
  const cells = normalizeCells(board.cells, slotCount);
  const links = normalizeLinks(board.links, slotCount);

  return {
    id: String(raw.id || GAME_ID),
    version: Number.isInteger(raw.version) ? raw.version : 1,
    title: String(raw.title || 'Почему я до сих пор курю'),
    intention: String(raw.intention || DEFAULT_INTENTION),
    dice: { min: diceMin, max: diceMax },
    entryRoll,
    board: {
      slotCount,
      overshoot,
      cells,
      links,
    },
    narratorRules: normalizeNarratorRules(raw.narratorRules),
  };
}

export function getCellBySlot(definition, slot) {
  return definition.board.cells.find((cell) => cell.slot === slot) ?? null;
}

export function getCellById(definition, cellId) {
  return definition.board.cells.find((cell) => cell.id === cellId) ?? null;
}

export function getLinkFromSlot(definition, slot) {
  return definition.board.links.find((link) => link.fromSlot === slot) ?? null;
}

export function listVisibleSlots(definition) {
  return definition.board.cells
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((cell) => ({
      slot: cell.slot,
      cellId: cell.id,
      title: cell.title,
    }));
}

function normalizeCells(rawCells, slotCount) {
  if (!Array.isArray(rawCells) || rawCells.length === 0) {
    throw new Error('GameDefinition must include cells');
  }

  const cells = rawCells.map((cell, index) => createCell({
    id: cell.id ?? `cell_${index + 1}`,
    internalName: cell.internalName,
    slot: cell.slot,
    title: cell.title ?? `Клетка ${cell.slot ?? index + 1}`,
    aiInstruction: cell.aiInstruction,
  }));

  const slots = new Set();
  const ids = new Set();
  for (const cell of cells) {
    if (!Number.isInteger(cell.slot) || cell.slot < 1 || cell.slot > slotCount) {
      throw new Error(`Cell ${cell.id} has slot outside 1..${slotCount}`);
    }
    if (slots.has(cell.slot)) {
      throw new Error(`Duplicate cell slot: ${cell.slot}`);
    }
    if (ids.has(cell.id)) {
      throw new Error(`Duplicate cell id: ${cell.id}`);
    }
    slots.add(cell.slot);
    ids.add(cell.id);
  }

  if (slots.size !== slotCount) {
    throw new Error(`GameDefinition must define a cell for every slot 1..${slotCount}`);
  }

  return cells.sort((a, b) => a.slot - b.slot);
}

function normalizeLinks(rawLinks, slotCount) {
  if (rawLinks == null) return [];
  if (!Array.isArray(rawLinks)) {
    throw new Error('GameDefinition.board.links must be an array');
  }

  return rawLinks.map((link) => {
    const type = link.type === LINK_TYPE.SNAKE ? LINK_TYPE.SNAKE : LINK_TYPE.ARROW;
    const fromSlot = Number(link.fromSlot);
    const toSlot = Number(link.toSlot);
    if (!Number.isInteger(fromSlot) || !Number.isInteger(toSlot)) {
      throw new Error('Link fromSlot/toSlot must be integers');
    }
    if (fromSlot < 1 || fromSlot > slotCount || toSlot < 1 || toSlot > slotCount) {
      throw new Error(`Link ${fromSlot}→${toSlot} is outside the board`);
    }
    if (fromSlot === toSlot) {
      throw new Error('Link cannot start and end on the same slot');
    }
    return { type, fromSlot, toSlot };
  });
}

function normalizeNarratorRules(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    oneQuestionPerTurn: src.oneQuestionPerTurn !== false,
    mayDiagnose: false,
    mayAdviseQuit: false,
    hypothesisLanguage: src.hypothesisLanguage || 'Похоже, здесь может быть связь с…',
    forbiddenDiagnosisLanguage: src.forbiddenDiagnosisLanguage || 'Ты куришь потому что…',
    forbidden: Array.isArray(src.forbidden) && src.forbidden.length
      ? src.forbidden.map(String)
      : [
        'советы как бросить',
        'замена сигарете',
        'дыхательные техники',
        'смена привычек',
        'новый автомат',
        'план отказа',
        'мотивация силой воли',
      ],
  };
}
