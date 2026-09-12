import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HYPOTHESIS_STATUS,
  OVERSHOOT,
  SESSION_STATUS,
  addDiscoveredPattern,
  addSessionHypothesis,
  addUncoveredDomain,
  applyDefinitionMove,
  applyDiceRoll,
  canApplyDiceRoll,
  completeGame,
  createDefinition,
  createGameSession,
  createHypothesis,
  currentTurn,
  enterReflection,
  isPatternIncomplete,
  listVisibleSlots,
  recordNarration,
  recordUserAnswer,
  resumePlay,
  sessionResearchView,
  toPublicHypothesis,
  updateSessionHypothesis,
} from '../services/whyISmokeGame/index.js';

function tinyBoard(overrides = {}) {
  const slotCount = overrides.slotCount ?? 6;
  const cells = Array.from({ length: slotCount }, (_, i) => ({
    id: `c${i + 1}`,
    slot: i + 1,
    title: `Клетка ${i + 1}`,
    aiInstruction: `Ракурс ${i + 1}`,
  }));
  return createDefinition({
    id: 'test_board',
    slotCount,
    cells,
    links: overrides.links ?? [],
    overshoot: overrides.overshoot,
    entryRoll: overrides.entryRoll,
    dice: overrides.dice,
  });
}

function play(definition, rolls, { answer = 'ок' } = {}) {
  let session = createGameSession({ definition });
  for (const roll of rolls) {
    const result = applyDiceRoll(session, definition, roll);
    session = result.session;
    if (result.move.entrySuccess || result.move.entered && result.move.cell) {
      session = recordUserAnswer(session, answer);
    }
  }
  return session;
}

test('default definition is a configurable 24-cell investigation board', () => {
  const definition = createDefinition();
  assert.equal(definition.id, 'why_i_smoke_game');
  assert.equal(definition.board.slotCount, 24);
  assert.equal(definition.board.cells.length, 24);
  assert.equal(definition.intention, 'Почему я до сих пор курю?');
  assert.equal(definition.narratorRules.oneQuestionPerTurn, true);
  assert.equal(definition.narratorRules.mayAdviseQuit, false);
  assert.ok(definition.narratorRules.forbidden.includes('новый автомат'));
  assert.deepEqual(listVisibleSlots(definition).map((s) => s.slot), Array.from({ length: 24 }, (_, i) => i + 1));
  assert.equal(definition.board.cells[3].title, 'Пауза');
  assert.match(definition.board.cells[3].aiInstruction, /не утверждай|склеилась|пауза/i);
});

test('createGameSession starts off the board with empty research', () => {
  const session = createGameSession({ userId: 'user-1', initialAnswer: 'Не знаю' });
  assert.equal(session.status, SESSION_STATUS.ACTIVE);
  assert.equal(session.userId, 'user-1');
  assert.equal(session.currentPosition, 0);
  assert.equal(session.entered, false);
  assert.equal(session.turnNumber, 0);
  assert.equal(session.initialIntention, 'Почему я до сих пор курю?');
  assert.equal(session.initialAnswer, 'Не знаю');
  assert.deepEqual(session.hypotheses, []);
  assert.deepEqual(session.discoveredPatterns, []);
});

test('failed entry stays off the board and allows another roll', () => {
  const definition = tinyBoard();
  let { session, move, turn } = applyDiceRoll(createGameSession({ definition }), definition, 4);
  assert.equal(move.entrySuccess, false);
  assert.equal(session.currentPosition, 0);
  assert.equal(session.entered, false);
  assert.equal(turn.cellId, null);
  assert.equal(canApplyDiceRoll(session), true);
});

test('successful entry uses definition title and blocks the next roll until an answer', () => {
  const definition = tinyBoard();
  let { session, move } = applyDiceRoll(createGameSession({ definition }), definition, 6);
  assert.equal(move.entrySuccess, true);
  assert.equal(session.currentPosition, 1);
  assert.equal(currentTurn(session).cellTitleShownToUser, 'Клетка 1');
  assert.equal(canApplyDiceRoll(session), false);
  assert.throws(() => applyDiceRoll(session, definition, 2), /waiting for an answer/);

  session = recordNarration(session, {
    observation: 'Похоже, здесь может быть связь с началом.',
    question: 'Как появилась первая сигарета?',
  });
  session = recordUserAnswer(session, 'На балконе у старшего брата');
  assert.equal(canApplyDiceRoll(session), true);
  assert.equal(currentTurn(session).userAnswer, 'На балконе у старшего брата');
  assert.equal(session.conversation.length, 2);
});

test('arrows, snakes and bounce overshoot follow the definition, not hardcoded cells', () => {
  const definition = tinyBoard({
    links: [
      { type: 'arrow', fromSlot: 3, toSlot: 6 },
      { type: 'snake', fromSlot: 5, toSlot: 2 },
    ],
  });
  let session = play(definition, [6]);
  let result = applyDiceRoll(session, definition, 2);
  assert.equal(result.move.landedSlot, 3);
  assert.equal(result.move.jump.type, 'arrow');
  assert.equal(result.session.currentPosition, 6);
  assert.equal(result.turn.cellId, 'c6');

  session = recordUserAnswer(result.session, 'дальше');
  result = applyDiceRoll(session, definition, 5);
  // 6 + 5 = 11 → bounce to 1
  assert.equal(result.move.overshot, true);
  assert.equal(result.session.currentPosition, 1);

  const stay = tinyBoard({ overshoot: OVERSHOOT.STAY });
  const fromFive = applyDefinitionMove(stay, { position: 5, entered: true }, 3);
  assert.equal(fromFive.overshot, true);
  assert.equal(fromFive.toPosition, 5);

  session = play(definition, [6]);
  session = recordUserAnswer(applyDiceRoll(session, definition, 4).session, 'змея');
  // from 1 + 4 = 5 → snake to 2
  const snake = applyDefinitionMove(definition, { position: 1, entered: true }, 4);
  assert.equal(snake.jump.type, 'snake');
  assert.equal(snake.toPosition, 2);
});

test('30 and 36 slot boards are valid GameDefinitions', () => {
  for (const slotCount of [30, 36]) {
    const definition = tinyBoard({ slotCount });
    assert.equal(definition.board.slotCount, slotCount);
    const move = applyDefinitionMove(definition, { position: 0, entered: false }, 6);
    assert.equal(move.toPosition, 1);
    const later = applyDefinitionMove(definition, { position: slotCount - 1, entered: true }, 3);
    assert.ok(later.toPosition >= 1 && later.toPosition <= slotCount);
  }
});

test('definition rejects incomplete or colliding boards', () => {
  assert.throws(() => createDefinition({ slotCount: 2, cells: [{ id: 'a', slot: 1, title: 'A' }] }), /every slot/);
  assert.throws(() => createDefinition({
    slotCount: 2,
    cells: [
      { id: 'a', slot: 1, title: 'A' },
      { id: 'a', slot: 2, title: 'B' },
    ],
  }), /Duplicate cell id/);
});

test('hypothesis lifecycle stays internal and never exposes percent confidence', () => {
  let session = createGameSession();
  session = addSessionHypothesis(session, {
    statement: 'Сигарета стала способом разрешить себе паузу после законченной задачи.',
  });
  const [created] = session.hypotheses;
  assert.equal(created.status, HYPOTHESIS_STATUS.CANDIDATE);
  assert.equal(typeof created.confidence, 'number');

  session = updateSessionHypothesis(session, created.id, {
    evidence: 'После задачи сразу выхожу покурить',
    status: HYPOTHESIS_STATUS.SUPPORTED,
  });
  assert.equal(session.hypotheses[0].status, HYPOTHESIS_STATUS.SUPPORTED);
  assert.equal(session.hypotheses[0].hasBeenRealityChecked, true);
  assert.equal(session.hypotheses[0].timesObserved, 1);

  session = updateSessionHypothesis(session, created.id, {
    counterEvidence: 'Три месяца не курил и всё равно выходил с кофе',
    status: HYPOTHESIS_STATUS.CONTRADICTED,
  });
  assert.equal(session.hypotheses[0].status, HYPOTHESIS_STATUS.CONTRADICTED);

  session = updateSessionHypothesis(session, created.id, { status: HYPOTHESIS_STATUS.DISCARDED });
  const publicView = toPublicHypothesis(session.hypotheses[0]);
  assert.equal(publicView.status, HYPOTHESIS_STATUS.DISCARDED);
  assert.equal('confidence' in publicView, false);
  assert.ok(!JSON.stringify(publicView).includes('%'));
});

test('discovered patterns may be incomplete trigger-action-function-belief chains', () => {
  let session = createGameSession();
  session = addDiscoveredPattern(session, {
    trigger: 'закончил рабочую задачу',
    action: 'вышел покурить',
    function: 'сделать паузу / переключиться',
    belief: 'без сигареты пауза ощущается неполноценной',
  });
  session = addDiscoveredPattern(session, { trigger: 'утро' });
  assert.equal(isPatternIncomplete(session.discoveredPatterns[0]), false);
  assert.equal(isPatternIncomplete(session.discoveredPatterns[1]), true);
  session = addUncoveredDomain(session, 'пауза');
  const view = sessionResearchView(session);
  assert.equal(view.discoveredPatterns[0].incomplete, false);
  assert.equal(view.discoveredPatterns[1].incomplete, true);
  assert.deepEqual(view.uncoveredDomains, ['пауза']);
});

test('status transitions: active → reflection → completed, with no rolls after lock', () => {
  const definition = tinyBoard();
  let session = play(definition, [6]);
  session = enterReflection(session);
  assert.equal(session.status, SESSION_STATUS.REFLECTION);
  assert.equal(canApplyDiceRoll(session), false);
  assert.throws(() => applyDiceRoll(session, definition, 2), /reflection/);

  session = resumePlay(session);
  assert.equal(session.status, SESSION_STATUS.ACTIVE);
  assert.equal(canApplyDiceRoll(session), true);

  session = completeGame(session, 'Курю, когда нужно разрешить себе паузу после задачи. Утро пока отдельно.');
  assert.equal(session.status, SESSION_STATUS.COMPLETED);
  assert.ok(session.finalAnswer.includes('паузу'));
  assert.throws(() => applyDiceRoll(session, definition, 3), /completed/);
  assert.throws(() => completeGame(session, 'ещё раз'), /already completed/);
});

test('createHypothesis requires a statement', () => {
  assert.throws(() => createHypothesis({ statement: '   ' }), /statement/);
});
