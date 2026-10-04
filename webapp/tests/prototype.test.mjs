import test from 'node:test';
import assert from 'node:assert/strict';
import { newPrototype, parsePrototype, canDiscover, discover, opening, context } from '../src/game/prototypeState.ts';
function episode() { return { events: ['Звонок','Вышел','Перекур'], moment: 'Не знаю где', expectation: 'Не помню', observation: 'Пока неясно' }; }
test('opening a door alone earns no discovery; uncertainty can be saved without AI', () => {
  const s = newPrototype();
  assert.equal(canDiscover(s,'stress'),false);
  assert.deepEqual(discover(s,'stress'),s);
  s.episode = episode();
  assert.equal(canDiscover(s,'stress'),true);
  const done = discover(s,'stress');
  assert.deepEqual(done.discoveries,['stress']);
  assert.equal(done.view,'doors');
});
test('later actions depend on a real first discovery, not AI message count', () => {
  const s = newPrototype(); s.components = ['Курение']; s.hypothesis = 'Считаю его важным';
  assert.equal(canDiscover(s,'ritual'),false);
  s.episode = episode(); const done = discover(s,'stress');
  assert.equal(canDiscover(done,'ritual'),true);
  assert.equal(done.chats.stress.length,0);
});
test('both room orders work and disagreement does not block comparison', () => {
  const s = newPrototype(); s.episode = episode();
  const first = discover(s,'stress');
  first.second.events = ['Другой звонок']; first.comparison = 'Похоже'; first.interpretation = 'По-прежнему считаю что помогает';
  const second = discover(first,'loop');
  assert.deepEqual(second.discoveries,['stress','loop']);
  second.components = ['Пауза']; second.hypothesis = 'Почему этот момент важен?';
  assert.equal(canDiscover(second,'ritual'),true);
});
test('an explicitly incomparable case can progress; blank work cannot', () => {
  const s = newPrototype(); s.episode = episode(); const first = discover(s,'stress');
  first.comparison = 'Не могу сравнить'; first.interpretation = 'Другой случай пока не помню';
  assert.equal(canDiscover(first,'loop'),true);
  first.comparison = 'Похоже'; assert.equal(canDiscover(first,'loop'),false);
});
test('revision preserves earlier interpretation and avoids duplicates', () => {
  const s = newPrototype(); s.episode = episode(); let first = discover(s,'stress');
  first.comparison = 'Не могу сравнить'; first.interpretation = 'Не уверен';
  first = discover(first,'loop'); first = discover(first,'loop');
  assert.deepEqual(first.revisions,['Не уверен']);
  first.interpretation = 'Теперь уточнил'; first = discover(first,'loop');
  assert.deepEqual(first.revisions,['Не уверен','Теперь уточнил']);
});
test('save restores model and chat, corrupt saves safely reset', () => {
  const s = newPrototype(); s.episode = episode(); s.chats.stress.push({role:'user',content:'Моя история'});
  assert.equal(JSON.stringify(parsePrototype(JSON.stringify(s))),JSON.stringify(s));
  assert.deepEqual(parsePrototype('{'),newPrototype());
  const invalid = parsePrototype(JSON.stringify({version:1,room:'unknown',discoveries:['stress','evil','stress'],chats:{stress:[null,{role:'system',content:'x'}]},episode:{events:44}}));
  assert.equal(invalid.room,'stress'); assert.deepEqual(invalid.discoveries,['stress']); assert.equal(invalid.chats.stress.length,0);
});
test('new room opening and AI context carry confirmed personal data', () => {
  const s = newPrototype(); s.episode = episode();
  assert.match(opening(s,'ritual'),/Не знаю где/);
  assert.match(context(s)[1],/Звонок → Вышел → Перекур/);
  s.hypothesis = 'Можно ли сохранить паузу?';
  assert.match(context(s)[2],/Предположение, не факт/);
});
test('first door follows selected reason and older saves retain default compatibility', () => {
  const s = newPrototype(); s.initialReason = 'Мне нравится';
  assert.match(opening(s,'stress'),/Что тебе нравится/);
  s.initialReason = 'Помогает расслабиться'; assert.match(opening(s,'stress'),/успокоиться/);
  s.initialReason = 'Просто скучно'; assert.match(opening(s,'stress'),/Просто скучно/);
  const old = {...s}; delete old.initialReason;
  assert.equal(parsePrototype(JSON.stringify(old)).initialReason,'');
});

test('new first room needs conversation and own note, not a forced timeline', () => {
  const s = newPrototype(); s.firstThought = 'Мне важна сама пауза, но пока не знаю насчёт сигареты';
  s.chats.stress = [{role:'user',content:'Мне нравится посидеть спокойно'}];
  assert.equal(canDiscover(s,'stress'),false);
  s.chats.stress.push({role:'user',content:'Без сигареты как будто чего-то не хватает'}, {role:'user',content:'Наверное, я привык связывать паузу с курением'});
  assert.equal(canDiscover(s,'stress'),true);
  assert.equal(s.episode.events.length,0);
  const saved = parsePrototype(JSON.stringify(s));
  assert.equal(saved.firstThought,s.firstThought);
  assert.match(opening(discover(saved,'stress'),'ritual'),/Мне важна сама пауза/);
});
test('offline note remains possible and untouched old opening migrates without losing conversations', () => {
  const s = newPrototype(); s.firstThought = 'Пока не понимаю, чего боюсь';
  s.chats.stress = [{role:'assistant',mode:'offline',content:'Нет связи'}];
  assert.equal(canDiscover(s,'stress'),true);
  s.chats.stress = [{role:'assistant',mode:'authored',content:'Вспомни последний напряжённый момент'}];
  assert.doesNotMatch(parsePrototype(JSON.stringify(s)).chats.stress[0].content,/напряжённый/);
  s.chats.stress.push({role:'user',content:'Не хочу вспоминать'});
  assert.deepEqual(JSON.parse(JSON.stringify(parsePrototype(JSON.stringify(s)).chats.stress)),JSON.parse(JSON.stringify(s.chats.stress)));
});
