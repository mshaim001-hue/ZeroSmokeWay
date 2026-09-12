import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HYPOTHESIS_STATUS,
  SESSION_STATUS,
  addDiscoveredPattern,
  addSessionHypothesis,
  addUncoveredDomain,
  applyDefinitionMove,
  applyDiceRoll,
  canApplyDiceRoll,
  cellVisitHistory,
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
  wrapPosition,
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
    dice: overrides.dice,
  });
}

function play(definition, rolls, { answer = 'ок' } = {}) {
  let session = createGameSession({ definition, initialAnswer: 'Не знаю' });
  for (const roll of rolls) {
    const result = applyDiceRoll(session, definition, roll);
    session = result.session;
    if (result.move.cell) {
      session = recordUserAnswer(session, answer);
    }
  }
  return session;
}

test('default definition is a 23-cell investigation board without Mirror', () => {
  const definition = createDefinition();
  assert.equal(definition.id, 'why_i_smoke_game');
  assert.equal(definition.board.slotCount, 23);
  assert.equal(definition.board.cells.length, 23);
  assert.equal(definition.intention, 'Почему я до сих пор курю?');
  assert.equal(definition.narratorRules.oneQuestionPerTurn, true);
  assert.equal(definition.narratorRules.mayAdviseQuit, false);
  assert.ok(definition.narratorRules.forbidden.includes('новый автомат'));
  assert.deepEqual(listVisibleSlots(definition).map((s) => s.title), [
    'Рождение', 'Иллюзия', 'Гнев', 'Не отпускаю', 'Тело', 'Контроль',
    'Вкус момента', 'Стимуляция', 'Пустота', 'Фантазия', 'Награда', 'Автомат',
    'Вина', 'Окружение', 'Печаль', 'Бунт', 'Баланс', 'Наблюдатель',
    'Осознание', 'Проверка реальностью', 'Рационализация', 'Тьма', 'Внутреннее пространство',
  ]);
  assert.equal(definition.board.links.length, 0);
  assert.equal('entryRoll' in definition, false);
  assert.ok(!definition.board.cells.some((cell) => cell.id === 'mirror' || cell.title === 'Зеркало'));
  assert.match(definition.board.cells[10].aiInstruction, /наград|пауз|завершен/i);
});

test('createGameSession starts in the game with empty research and no entry gate', () => {
  const session = createGameSession({ userId: 'user-1', initialAnswer: 'Не знаю' });
  assert.equal(session.status, SESSION_STATUS.ACTIVE);
  assert.equal(session.userId, 'user-1');
  assert.equal(session.currentPosition, 0);
  assert.equal(session.entered, true);
  assert.equal(session.phase, 'playing');
  assert.equal(session.turnNumber, 0);
  assert.equal(session.initialAnswer, 'Не знаю');
  assert.deepEqual(session.hypotheses, []);
  assert.equal(canApplyDiceRoll(session), true);
});

test('first roll without a six lands on that cell', () => {
  const definition = tinyBoard();
  const { session, move } = applyDiceRoll(createGameSession({ definition }), definition, 2);
  assert.equal(move.toPosition, 2);
  assert.equal(session.currentPosition, 2);
  assert.equal(currentTurn(session).cellTitleShownToUser, 'Клетка 2');
  assert.equal(canApplyDiceRoll(session), false);
  assert.throws(() => applyDiceRoll(session, definition, 3), /waiting for an answer/);
});

test('a landed cell blocks the next roll until an answer', () => {
  const definition = tinyBoard();
  let { session } = applyDiceRoll(createGameSession({ definition }), definition, 4);
  session = recordNarration(session, {
    observation: 'Похоже, здесь может быть связь с началом.',
    question: 'Что здесь от тебя?',
  });
  session = recordUserAnswer(session, 'На балконе у старшего брата');
  assert.equal(canApplyDiceRoll(session), true);
  assert.equal(currentTurn(session).userAnswer, 'На балконе у старшего брата');
});

test('board wraps and ignores leftover snakes or ladders', () => {
  assert.equal(wrapPosition(20, 2, 23), 22);
  assert.equal(wrapPosition(20, 3, 23), 23);
  assert.equal(wrapPosition(20, 4, 23), 1);
  assert.equal(wrapPosition(22, 4, 23), 3);
  assert.equal(wrapPosition(0, 5, 23), 5);

  const definition = createDefinition();
  const fromTwenty = applyDefinitionMove(definition, { position: 20 }, 4);
  assert.equal(fromTwenty.toPosition, 1);
  assert.equal(fromTwenty.wrapped, true);
  assert.equal(fromTwenty.jump, null);

  const withDeadLinks = tinyBoard({
    links: [{ type: 'arrow', fromSlot: 3, toSlot: 6 }],
  });
  const moved = applyDefinitionMove(withDeadLinks, { position: 1 }, 2);
  assert.equal(moved.toPosition, 3);
  assert.equal(moved.jump, null);
});

test('revisiting a cell is allowed and keeps previous questions', () => {
  const definition = tinyBoard({ slotCount: 6 });
  let session = createGameSession({ definition, initialAnswer: 'Потому что нравится' });
  session = applyDiceRoll(session, definition, 2).session;
  session = recordNarration(session, { question: 'Есть ли ситуации, когда сигарета ощущается как награда?' });
  session = recordUserAnswer(session, 'После задачи выхожу');
  session = applyDiceRoll(session, definition, 6).session;
  assert.equal(session.currentPosition, 2);
  assert.equal(currentTurn(session).revisit, true);
  const visit = cellVisitHistory(session, 'c2');
  assert.equal(visit.count, 2);
  assert.ok(visit.questions.some((q) => /награда/.test(q)));
  assert.ok(visit.answers.some((a) => /задачи/.test(a)));
});

test('30 and 36 slot boards wrap instead of bouncing', () => {
  for (const slotCount of [30, 36]) {
    const definition = tinyBoard({ slotCount });
    assert.equal(definition.board.slotCount, slotCount);
    const first = applyDefinitionMove(definition, { position: 0 }, 6);
    assert.equal(first.toPosition, 6);
    const later = applyDefinitionMove(definition, { position: slotCount - 1 }, 3);
    assert.equal(later.toPosition, 2);
    assert.equal(later.wrapped, true);
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
  let session = play(definition, [2]);
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
