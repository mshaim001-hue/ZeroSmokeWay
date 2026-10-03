import test from 'node:test';
import assert from 'node:assert/strict';
import { ROOMS, ROOM_ORDER } from '../src/game/content.ts';
import { newJourney, newRoomProgress, parseJourney, doorDestinations, exportJourney, canCompleteRoom } from '../src/game/state.ts';
test('all34 topics, dialogue schema, undirected graph',()=>{
 assert.deepEqual([...new Set(ROOMS.flatMap(r=>r.topicIds))].sort((a,b)=>a-b),Array.from({length:34},(_,i)=>i+1));
 assert.equal(ROOM_ORDER.length,11);assert.ok(!ROOM_ORDER.includes('personal'));
 for(const r of ROOMS){assert.equal(r.steps,undefined);assert.ok(r.opening&&r.questions.length);for(const id of r.connections)assert.ok(ROOMS.find(x=>x.id===id).connections.includes(r.id));}
});
test('every branch reaches exit with all required rooms',()=>{
 for(const initial of ROOMS.map(r=>r.id).filter(id=>id!=='freedom')){
  const done=initial==='personal'?[]:[initial];let current=initial;
  while(done.length<11){const doors=doorDestinations(done,current);assert.ok(doors.length);const next=doors.at(-1);if(next==='freedom')assert.equal(done.length,10);assert.ok(!done.includes(next));done.push(next);current=next;}
  assert.deepEqual(doorDestinations(done,current),[]);
 }
});
test('all pending offered; neighbors and paths through visited rank first',()=>{
 const doors=doorDestinations(['pleasure'],'pleasure');assert.equal(doors.length,9);assert.deepEqual(new Set(doors.slice(0,3)),new Set(['ritual','company','loop']));assert.ok(!doors.includes('freedom'));
 const d=doorDestinations(['pleasure','ritual'],'ritual');assert.ok(d.indexOf('company')<d.indexOf('withdrawal'));
});
test('v1 migration preserves historical notes transcript answers and finished ending',()=>{
 const chats=Array.from({length:30},(_,i)=>({role:i%2?'user':'assistant',content:`Line ${i}`}));
 const s=parseJourney(JSON.stringify({version:1,started:true,view:'ending',roomId:'freedom',stage:'doors',completed:ROOM_ORDER,notes:{stress:'Note'},chats:{stress:chats},answers:{origin:['Old answer']}}));
 assert.equal(s.version,2);assert.equal(s.view,'ending');assert.equal(s.chats.stress.length,30);assert.equal(s.notes.stress,'Note');assert.equal(s.chats.origin[0].content,'Old answer');assert.ok(s.progress.stress.legacy&&s.progress.stress.ready);assert.deepEqual(s.completed,ROOM_ORDER);
});
test('readiness evidence and optional personal room persist',()=>{
 const p={...newRoomProgress(),phase:'reflect',evidence:{episode:'Yesterday',expectation:'Rest',observation:'Disagree',conclusion:''}};
 const s=parseJourney(JSON.stringify({...newJourney(),started:true,roomId:'personal',progress:{personal:p}}));assert.deepEqual(s.progress.personal,p);assert.equal(s.roomId,'personal');
 const ready=parseJourney(JSON.stringify({...s,stage:'doors',progress:{personal:{...p,ready:true,phase:'ready'}}}));assert.equal(ready.stage,'conversation');assert.equal(ready.progress.personal.ready,false);
 const a=newRoomProgress(),b=newRoomProgress();a.evidence.episode='changed';assert.equal(b.evidence.episode,'');
});
test('invalid data strips safely and final cannot be bypassed',()=>{
 for(const raw of ['null','{broken',JSON.stringify({...newJourney(),version:9})])assert.equal(parseJourney(raw),null);
 const s=parseJourney(JSON.stringify({...newJourney(),roomId:'unknown',view:'ending',stage:'doors',completed:['stress','stress','constructor'],volume:4}));assert.deepEqual(s.completed,['stress']);assert.equal(s.roomId,'pleasure');assert.equal(s.view,'lobby');assert.equal(s.stage,'conversation');assert.equal(s.volume,1);
});
test('dialogue export actual lines and notes only',()=>{
 const out=exportJourney({...newJourney(),initialReason:'My reason',notes:{personal:'Open question'},chats:{personal:[{role:'assistant',content:'What matters?'},{role:'user',content:'Time alone'}]}});assert.match(out,/Open question/);assert.match(out,/Я: Time alone/);assert.doesNotMatch(out,/Не записано|Архив цены/);
});

const userTurns=['Вчера после сложной работы мне хотелось выйти на улицу','Я ожидал спокойствия и короткой паузы для себя','Я заметил что разговор тоже помогает мне остановиться'];
const genuine = () => ({...newJourney(),roomId:'stress',stage:'doors',progress:{stress:{phase:'ready',ready:true,evidence:{episode:'после сложной работы',expectation:'спокойствия и короткой паузы',observation:'разговор тоже помогает',conclusion:'мне остановиться'}}},chats:{stress:userTurns.map(content=>({role:'user',content}))}});
test('completion needs three distinct meaningful user turns and all evidence grounded in user text',()=>{
 const s=genuine();assert.ok(canCompleteRoom(s,'stress'));assert.equal(parseJourney(JSON.stringify(s)).stage,'doors');
 assert.equal(canCompleteRoom({...s,chats:{stress:[s.chats.stress[0]]}},'stress'),false);
 const invented={...s,progress:{stress:{...s.progress.stress,evidence:{...s.progress.stress.evidence,conclusion:'AI invented conclusion'}}},chats:{stress:[...s.chats.stress,{role:'assistant',content:'AI invented conclusion'}]}};
 assert.equal(canCompleteRoom(invented,'stress'),false);assert.equal(parseJourney(JSON.stringify(invented)).progress.stress.ready,false);
 assert.equal(canCompleteRoom({...s,completed:['stress']},'stress'),false);
 assert.equal(canCompleteRoom({...s,progress:{stress:{...s.progress.stress,legacy:true}}},'stress'),false);
});

test('client dialogue topics and openings match server scenario files', async () => {
  const {readFileSync}=await import('node:fs');
  const serverTopics=JSON.parse(readFileSync(new URL('../../backend/services/labyrinthTopics.json',import.meta.url),'utf8'));
  const openings=JSON.parse(readFileSync(new URL('../src/game/doorOpenings.json',import.meta.url),'utf8'));
  for(const room of ROOMS) {
    assert.deepEqual(serverTopics[room.id],room.questions);
    assert.equal(openings[room.id],room.opening);
    assert.ok(!('steps' in room) && !('object' in room) && !('choices' in room));
  }
});
test('a migrated completed room cannot become a fresh finishable conversation', () => {
  const restored=parseJourney(JSON.stringify({version:1,started:true,view:'room',roomId:'stress',stage:'intro',completed:['stress'],chats:{stress:[{role:'user',content:'Старая переписка'}]}}));
  assert.equal(restored.stage,'doors');
  assert.equal(restored.progress.stress.legacy,true);
  assert.equal(canCompleteRoom(restored,'stress'),false);
});
