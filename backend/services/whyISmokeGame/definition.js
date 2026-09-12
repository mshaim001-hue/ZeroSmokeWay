import { DEFAULT_INTENTION, GAME_ID, LINK_TYPE } from './constants.js';

const DEFAULT_CELLS = [
  ['birth', 'Рождение', 'Исследуй начало курения в его словах. Не спрашивай шаблонно «как началось?» — ищи, что от того начала осталось сегодня.'],
  ['illusion', 'Иллюзия', 'Проверь, что человек приписывает сигарете. Не разоблачай и не спорь — только заметь расхождение между ожиданием и опытом, если оно уже есть в его словах.'],
  ['anger', 'Гнев', 'Исследуй, появляется ли сигарета рядом с раздражением, злостью, сдержанным конфликтом. Если нет — не натягивай.'],
  ['holding_on', 'Не отпускаю', 'Проверь, держится ли человек за сигарету как за что-то своё. Только если это уже мерцает в его формулировках.'],
  ['body', 'Тело', 'Смотри на телесные ощущения, которые он сам называет: вкус, руки, горло, «полегчало». Не ставь диагноз телу.'],
  ['control', 'Контроль', 'Исследуй контроль и его потерю: «я решаю» против «руки сами». Не учи контролировать иначе.'],
  ['taste_of_moment', 'Вкус момента', 'Проверь, склеилась ли сигарета с конкретным приятным куском жизни. Если момент бывает и без неё — гипотеза слабеет.'],
  ['stimulation', 'Стимуляция', 'Исследуй «взбодриться / включиться». Не утверждай, что сигарета даёт энергию.'],
  ['emptiness', 'Пустота', 'Проверь, появляется ли сигарета в паузе, скуке, дыре в дне. Несогласие — нормальный исход.'],
  ['fantasy', 'Фантазия', 'Как он себе объясняет сигарету в воображении, заранее, «будет хорошо». Отдели фантазию от случившегося факта.'],
  ['reward', 'Награда', 'Исследуй связь с завершением действия, разрешением на паузу или наградой. Используй только его контекст. Не спрашивай шаблонно «ты куришь как награду?»'],
  ['automaton', 'Автомат', 'Ищи движение без мысли. Не строй «новый автомат» и не предлагай заменить привычку.'],
  ['guilt', 'Вина', 'Проверь вину, стыд, «не надо было» — только если он сам их назвал. Не насаждай вину.'],
  ['surroundings', 'Окружение', 'Социальный контекст: люди, место, «так принято». Если курит и один — не натягивай компанию.'],
  ['sadness', 'Печаль', 'Рядом ли сигарета с грустью, тяжёлым настроением. Если нет — смени ракурс.'],
  ['revolt', 'Бунт', 'Есть ли жест «не буду правильным» / вопреки. Только из его слов.'],
  ['balance', 'Баланс', 'Проверь мысль «так я выравниваюсь / держусь». Не предлагай другой баланс.'],
  ['observer', 'Наблюдатель', 'Помоги ему заметить свой же повтор, не интерпретируя за него.'],
  ['awareness', 'Осознание', 'Если он уже что-то увидел своими словами — уточни это. Не добавляй новую теорию.'],
  ['reality_probe', 'Проверка реальностью', 'Архетип поля, не системный финал. Проверь одну конкретную гипотезу на живом случае. Не путай с завершающим reality check движка.'],
  ['rationalization', 'Рационализация', 'Как он оправдывает сигарету себе. Это гипотеза, не приговор и не разоблачение лжеца.'],
  ['darkness', 'Тьма', 'Тяжёлые, стыдные или скрытые куски — только если он сам туда идёт. Не копай насильно.'],
  ['inner_space', 'Внутреннее пространство', 'Что сигарета делает с внутренним местом: тишина, отдельность, «моя минута». Проверь и попытайся опровергнуть.'],
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
  const slotCount = Number.isInteger(raw.slotCount) ? raw.slotCount : (raw.board?.slotCount ?? DEFAULT_CELLS.length);
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

  const links = Array.isArray(raw.links) ? raw.links : (raw.board?.links ?? []);

  return normalizeGameDefinition({
    id: raw.id ?? GAME_ID,
    version: raw.version ?? 2,
    title: raw.title ?? 'Почему я до сих пор курю',
    intention: raw.intention ?? DEFAULT_INTENTION,
    dice: raw.dice,
    board: {
      slotCount,
      wrap: true,
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

  const cells = normalizeCells(board.cells, slotCount);
  const links = normalizeLinks(board.links, slotCount);

  return {
    id: String(raw.id || GAME_ID),
    version: Number.isInteger(raw.version) ? raw.version : 2,
    title: String(raw.title || 'Почему я до сих пор курю'),
    intention: String(raw.intention || DEFAULT_INTENTION),
    dice: { min: diceMin, max: diceMax },
    board: {
      slotCount,
      wrap: true,
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
        'вода как замена',
        'прогулка вместо сигареты',
        'спорт как coping',
        'смена привычек',
        'новый автомат',
        'план отказа',
        'мотивация силой воли',
      ],
  };
}
