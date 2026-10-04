import test from 'node:test';
import assert from 'node:assert/strict';
import {ROOMS,ROOM_IDS,THEME_IDS} from '../src/game/rooms.ts';
import {newGame,parseGame,canEnter,enterRoom,inspectObject,actInRoom,canComplete,completeRoom,sceneReady,noteCandidate,availableDoors,completedThemes,dialogueContext,exportGame} from '../src/game/gameState.ts';
function finish(s,id,note='Я пока не согласен и хочу проверить это сам'){
  s=enterRoom(s,id);
  for(const o of ROOMS[id].objects)s=inspectObject(s,o.id);
  if(['pleasure','ritual'].includes(id))s=inspectObject(s,ROOMS[id].objects[1].id);
  if(id==='tomorrow')s.rooms[id].adjusted=true;
  s=actInRoom(s);if(ROOMS[id].mechanic==='unpack'){s=actInRoom(s);s=actInRoom(s);}
  s.rooms[id].chat.push({role:'user',content:note});
  assert.equal(canComplete(s),true,id);
  return completeRoom(s);
}
test('opening and chat alone cannot unlock space; no message-count gate',()=>{
  let s=enterRoom(newGame(),'entry','Мне нравится');
  s.rooms.entry.chat.push(...Array(8).fill({role:'user',content:'Я ответил'}));
  assert.equal(canComplete(s),false);
  for(const o of ROOMS.entry.objects)s=inspectObject(s,o.id);
  assert.equal(canComplete(s),false);
  s=actInRoom(s);s.rooms.entry.chat=s.rooms.entry.chat.slice(0,2);
  assert.equal(canComplete(s),true);
  assert.equal(noteCandidate(s),'Я ответил');
});
test('all ten doors are available after entry, any order leads to real ending',()=>{
  let s=finish(newGame(),'entry');
  assert.equal(availableDoors(s).filter(id=>THEME_IDS.includes(id)).length,10);
  assert.equal(canEnter(s,'freedom'),false);
  const order=['world','withdrawal','origin','price','loop','company','tomorrow','ritual','stress','pleasure'];
  for(const id of order){s=finish(s,id);assert.equal(s.view,'doors');}
  assert.equal(completedThemes(s),10);assert.equal(canEnter(s,'freedom'),true);
  s=finish(s,'freedom','Хочу попробовать жить без сигарет');
  assert.equal(s.view,'ending');assert.equal(s.rooms.freedom.completed,true);
  assert.deepEqual(s.order,['entry',...order,'freedom']);
});
test('locked doors cannot be opened or completed through state helpers',()=>{
  const s=newGame();assert.equal(enterRoom(s,'price'),s);assert.equal(canEnter(s,'freedom'),false);
  s.room='freedom';s.rooms.freedom.inspected=ROOMS.freedom.objects.map(o=>o.id);s.rooms.freedom.changed=true;s.rooms.freedom.note='Согласен';
  assert.equal(canComplete(s),false);assert.equal(completeRoom(s),s);
});
test('every room has distinct scene data and backend topic-compatible id',()=>{
  assert.equal(ROOM_IDS.length,12);assert.equal(THEME_IDS.length,10);
  for(const id of ROOM_IDS){assert.equal(ROOMS[id].objects.length,3);assert.equal(new Set(ROOMS[id].objects.map(o=>o.id)).size,3);assert.ok(ROOMS[id].opening);assert.ok(ROOMS[id].reward);}
  assert.ok(new Set(THEME_IDS.map(id=>ROOMS[id].mechanic)).size>=8);
});
test('custom reason stays its own entrance and feeds discussion',()=>{
  const s=enterRoom(newGame(),'entry','Чтобы не есть от скуки');assert.equal(s.room,'entry');assert.match(s.rooms.entry.chat[0].content,/не есть от скуки/);
});
test('every scene must be explored; unpack requires all three layers',()=>{
  let s=finish(newGame(),'entry');s=enterRoom(s,'world');
  for(const o of ROOMS.world.objects)s=inspectObject(s,o.id);s.rooms.world.note='Этот образ мне знаком';
  s=actInRoom(s);assert.equal(canComplete(s),false);s=actInRoom(s);assert.equal(canComplete(s),false);s=actInRoom(s);assert.equal(canComplete(s),true);
});
test('no API is needed: own uncertainty is saved without forced agreement',()=>{
  let s=enterRoom(newGame(),'entry');for(const o of ROOMS.entry.objects)s=inspectObject(s,o.id);s=actInRoom(s);
  assert.equal(sceneReady(s),true);assert.equal(canComplete(s),false);s.rooms.entry.note='Пока не понимаю';s=completeRoom(s);assert.equal(s.rooms.entry.note,'Пока не понимаю');
});
test('chat words move automatically into note, can be edited explicitly',()=>{
  let s=enterRoom(newGame(),'entry');s.rooms.entry.chat.push({role:'user',content:'Мне нравится отдыхать одному'});assert.equal(noteCandidate(s),'Мне нравится отдыхать одному');
  s.rooms.entry.note='Я хочу сохранить отдых';assert.equal(noteCandidate(s),'Я хочу сохранить отдых');
});
test('returning preserves conversations, notes and completed ending state',()=>{
  let s=finish(newGame(),'entry');s=finish(s,'pleasure','Первое мнение');
  s=enterRoom(s,'pleasure');assert.equal(s.rooms.pleasure.completed,true);assert.match(s.rooms.pleasure.chat.at(-1).content,/Первое мнение/);
  s.rooms.pleasure.note='Думаю иначе';s=completeRoom(s);assert.deepEqual(s.rooms.pleasure.notes,['Первое мнение','Думаю иначе']);assert.equal(s.order.filter(id=>id==='pleasure').length,1);
});
test('migration keeps old conversations and notes without deleting original save',()=>{
  const old={version:1,initialReason:'Помогает расслабиться',firstThought:'Мне важна пауза',hypothesis:'Хочу оставить кофе',interpretation:'Пока сомневаюсь',discoveries:['stress','ritual','loop'],chats:{stress:[{role:'user',content:'Я люблю перекур'}]},episode:{events:['Кофе','Балкон']},muted:true};
  const s=parseGame(null,JSON.stringify(old));assert.equal(s.rooms.entry.completed,true);assert.equal(s.rooms.ritual.completed,true);assert.equal(s.rooms.entry.chat[0].content,'Я люблю перекур');assert.equal(s.rooms.entry.note,'Мне важна пауза');assert.equal(s.muted,true);assert.equal(s.legacyNotes.includes('Кофе'),true);assert.equal(completedThemes(s),2);
});
test('save and reload preserve partial actions and full nonlinear route',()=>{
  let s=finish(newGame(),'entry');s=finish(s,'price');s=enterRoom(s,'company');s=inspectObject(s,'friends');
  s.rooms.company.price=450;s.rooms.company.value=22;
  const loaded=parseGame(JSON.stringify(s));assert.deepEqual(JSON.parse(JSON.stringify(loaded)),JSON.parse(JSON.stringify(s)));
});
test('corrupt values, forged objects and NaN are bounded during load',()=>{
  const s=parseGame(JSON.stringify({version:2,room:'missing',view:'ending',volume:42,rooms:{entry:{inspected:['x','habit','habit'],selected:['bad'],value:-5,price:'x',chat:[null,{role:'system',content:'hack'}]}},order:['bad']}));
  assert.equal(s.room,'entry');assert.equal(s.view,'doors');assert.equal(s.volume,1);assert.deepEqual(s.rooms.entry.inspected,['habit']);assert.equal(s.rooms.entry.value,0);assert.equal(s.rooms.entry.price,200);assert.deepEqual(s.rooms.entry.chat,[]);assert.deepEqual(s.rooms.entry.selected,[]);
  assert.equal(parseGame('{').version,2);
});
test('context carries scene actions and previous personal words; export includes incomplete chats',()=>{
  let s=finish(newGame(),'entry','Не хочу терять утренний кофе');s=enterRoom(s,'price');s.rooms.price.value=20;s.rooms.price.price=300;s=actInRoom(s);
  assert.match(dialogueContext(s).join('\n'),/109500/);assert.match(dialogueContext(s).join('\n'),/утренний кофе/);
  s.rooms.price.chat.push({role:'user',content:'Это много денег'});assert.match(exportGame(s),/Это много денег/);
});
test('inspecting twice toggles choice without inflating progress',()=>{
  let s=enterRoom(newGame(),'entry');s=inspectObject(s,'habit');s=inspectObject(s,'habit');assert.deepEqual(s.rooms.entry.inspected,['habit']);assert.deepEqual(s.rooms.entry.selected,[]);assert.equal(inspectObject(s,'bad'),s);
});
