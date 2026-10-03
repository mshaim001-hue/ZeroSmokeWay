import test from 'node:test';
import assert from 'node:assert/strict';
import { ROOMS, ROOM_ORDER } from '../src/game/content.ts';
import { newJourney, parseJourney, doorDestinations, exportJourney } from '../src/game/state.ts';

test('all 34 required topics occur on playable room steps', () => {
  const covered = new Set(ROOMS.flatMap(room => room.steps.flatMap(step => step.topics)));
  assert.deepEqual([...covered].sort((a,b) => a-b), Array.from({length:34}, (_,i) => i+1));
  assert.equal(new Set(ROOM_ORDER).size, ROOM_ORDER.length);
  for (const room of ROOMS) { assert.equal(room.steps.length, 3); assert.ok(room.steps.every(step => step.choices.length === 3)); }
});
test('exit is reachable from any initial door without skipping rooms', () => {
  for (const initial of ['pleasure','stress']) {
    const completed = [initial];
    let current = initial;
    while (completed.length < ROOM_ORDER.length) {
      const doors = doorDestinations(completed, current);
      assert.ok(doors.length, `No route after ${current}`);
      const next = doors[doors.length - 1];
      if (next === 'freedom') assert.equal(completed.length, ROOM_ORDER.length - 1);
      assert.ok(!completed.includes(next));
      completed.push(next); current = next;
    }
    assert.deepEqual(doorDestinations(completed, current), []);
  }
});
test('save corruption and incompatible versions recover safely', () => {
  assert.equal(parseJourney('{broken'), null);
  assert.equal(parseJourney('null'), null);
  assert.equal(parseJourney(JSON.stringify({...newJourney(),version:2})), null);
});
test('restored save strips unknown rooms and cannot bypass final completion', () => {
  const restored = parseJourney(JSON.stringify({...newJourney(),started:true,view:'ending',roomId:'unknown',stage:'doors',completed:['stress','stress','constructor'],stepIndex:999,volume:4}));
  assert.deepEqual(restored.completed,['stress']);
  assert.equal(restored.roomId,'pleasure');
  assert.equal(restored.view,'lobby');
  assert.equal(restored.stage,'intro');
  assert.equal(restored.volume,1);
});
test('a reload resumes exact answered step and private local notes', () => {
  const state={...newJourney(),started:true,view:'room',roomId:'stress',stage:'reflection',stepIndex:1,answers:{stress:['И то и другое','Даёт паузу']},notes:{stress:'Мне важно выйти из комнаты'},chats:{stress:[{role:'user',content:'Мой вопрос'},{role:'assistant',content:'Ответ',mode:'authored'}]}};
  const restored=parseJourney(JSON.stringify(state));
  assert.equal(restored.stage,'reflection');
  assert.equal(restored.stepIndex,1);
  assert.equal(restored.notes.stress,state.notes.stress);
  assert.equal(restored.chats.stress.length,2);
});
test('export contains personal answers and only explored rooms', () => {
  const output=exportJourney({...newJourney(),initialReason:'Моя причина',completed:['stress'],notes:{stress:'Личная запись'},answers:{stress:['Проблема','Пауза','Постепенно']}});
  assert.match(output,/Моя причина/); assert.match(output,/Личная запись/); assert.match(output,/Пауза/);
  assert.doesNotMatch(output,/Архив цены/);
});

test('dialogue export preserves the conversation instead of inventing questionnaire answers', () => {
  const output=exportJourney({...newJourney(),completed:['stress'],chats:{stress:[{role:'assistant',content:'Что даёт перекур?'},{role:'user',content:'Время побыть одному'}]}});
  assert.match(output,/Ведущий: Что даёт перекур/);
  assert.match(output,/Я: Время побыть одному/);
  assert.doesNotMatch(output,/Не записано/);
});
