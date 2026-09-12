import { LINK_TYPE, OVERSHOOT } from './constants.js';
import { getCellBySlot, getLinkFromSlot } from './definition.js';

export function clampDiceValue(definition, value) {
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw new Error('diceValue must be an integer');
  }
  const { min, max } = definition.dice;
  if (n < min || n > max) {
    throw new Error(`diceValue must be between ${min} and ${max}`);
  }
  return n;
}

/**
 * Чистый ход по GameDefinition. Не знает о UI и об AI.
 * @param {{ position: number, entered: boolean }} state
 * @param {number} diceValue
 */
export function applyDefinitionMove(definition, state, diceValue) {
  const roll = clampDiceValue(definition, diceValue);
  const position = Number.isInteger(state?.position) ? state.position : 0;
  const entered = Boolean(state?.entered);
  const slotCount = definition.board.slotCount;

  const result = {
    roll,
    fromPosition: entered ? position : 0,
    toPosition: entered ? position : 0,
    landedSlot: null,
    cell: null,
    jump: null,
    entryAttempt: !entered,
    entrySuccess: false,
    overshot: false,
    entered,
  };

  if (!entered) {
    if (roll !== definition.entryRoll) {
      return result;
    }
    const cell = requireCell(definition, 1);
    result.entrySuccess = true;
    result.entered = true;
    result.toPosition = 1;
    result.landedSlot = 1;
    result.cell = cell;
    return result;
  }

  let next = position + roll;
  if (next > slotCount) {
    result.overshot = true;
    if (definition.board.overshoot === OVERSHOOT.STAY) {
      next = position;
    } else {
      next = slotCount - (next - slotCount);
      if (next < 1) next = 1;
    }
  }

  result.landedSlot = next;
  const link = getLinkFromSlot(definition, next);
  if (link) {
    result.jump = { type: link.type, fromSlot: link.fromSlot, toSlot: link.toSlot };
    next = link.toSlot;
  }

  result.toPosition = next;
  result.entered = true;
  result.cell = requireCell(definition, next);
  return result;
}

function requireCell(definition, slot) {
  const cell = getCellBySlot(definition, slot);
  if (!cell) {
    throw new Error(`No cell defined for slot ${slot}`);
  }
  return cell;
}

export function describeMove(move, definition) {
  if (!move) return '';
  if (move.entryAttempt && !move.entrySuccess) {
    const needed = definition?.entryRoll ?? 'входной бросок';
    return `Выпало ${move.roll} — для входа нужна ${needed}.`;
  }
  if (move.entrySuccess) {
    return `Вход на клетку ${move.toPosition} «${move.cell.title}»`;
  }
  const landing = move.jump?.fromSlot ?? move.toPosition;
  let text = `${move.fromPosition} → ${move.roll} → ${landing} «${move.cell.title}»`;
  if (move.jump) {
    text += ` → ${move.jump.type === LINK_TYPE.ARROW ? 'стрела' : 'змея'} → ${move.toPosition}`;
  }
  if (move.overshot) text += ' (отражение)';
  return text;
}
