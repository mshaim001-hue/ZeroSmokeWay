import { getCellBySlot } from './definition.js';

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

export function wrapPosition(position, roll, slotCount) {
  if (!Number.isInteger(slotCount) || slotCount < 1) {
    throw new Error('slotCount must be a positive integer');
  }
  const from = Number.isInteger(position) && position > 0 ? position : 0;
  if (from < 1) {
    return ((roll - 1) % slotCount) + 1;
  }
  return ((from - 1 + roll) % slotCount) + 1;
}

/**
 * Чистый ход по GameDefinition. Без входа-шестёрки, без змей/стрел, без отскока.
 * @param {{ position?: number }} state
 * @param {number} diceValue
 */
export function applyDefinitionMove(definition, state, diceValue) {
  const roll = clampDiceValue(definition, diceValue);
  const slotCount = definition.board.slotCount;
  const fromPosition = Number.isInteger(state?.position) && state.position > 0 ? state.position : 0;
  const toPosition = wrapPosition(fromPosition, roll, slotCount);
  const wrapped = fromPosition >= 1 && (fromPosition - 1 + roll) >= slotCount;

  return {
    roll,
    fromPosition,
    toPosition,
    landedSlot: toPosition,
    cell: requireCell(definition, toPosition),
    jump: null,
    wrapped,
    revisit: false,
  };
}

function requireCell(definition, slot) {
  const cell = getCellBySlot(definition, slot);
  if (!cell) {
    throw new Error(`No cell defined for slot ${slot}`);
  }
  return cell;
}

export function describeMove(move) {
  if (!move?.cell) return '';
  const title = move.cell.title || '';
  if (!move.fromPosition) {
    return `Ход ${move.roll} → клетка ${move.toPosition} «${title}»`;
  }
  let text = `${move.fromPosition} → ${move.roll} → ${move.toPosition} «${title}»`;
  if (move.wrapped) text += ' (круг)';
  if (move.revisit) text += ' — уже были здесь';
  return text;
}
