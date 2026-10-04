import { ROOM_IDS, ROOMS, THEME_IDS, entryOpening, type RoomId } from './rooms.ts';
export type Message = { role:'user'|'assistant'; content:string; mode?:'ai'|'authored'|'offline' };
export type RoomState = { inspected:string[]; selected:string[]; action:number; value:number; price:number; changed:boolean; adjusted:boolean; note:string; notes:string[]; chat:Message[]; completed:boolean };
export type GameState = { version:2; view:'home'|'doors'|'room'|'ending'; room:RoomId; initialReason:string; rooms:Record<RoomId,RoomState>; order:RoomId[]; muted:boolean; volume:number; events:string[]; legacyNotes:string[] };
export const SAVE_KEY = 'zsw_labyrinth_v2';
export const LEGACY_KEY = 'zsw_three_rooms_v1';
export function freshRoom():RoomState { return {inspected:[],selected:[],action:0,value:10,price:200,changed:false,adjusted:false,note:'',notes:[],chat:[],completed:false}; }
export function newGame():GameState { return {version:2,view:'home',room:'entry',initialReason:'',rooms:Object.fromEntries(ROOM_IDS.map(id=>[id,freshRoom()])) as GameState['rooms'],order:[],muted:false,volume:.35,events:[],legacyNotes:[]}; }
const text = (v:unknown):string => typeof v === 'string' ? v.slice(0,2000) : '';
const strings = (v:unknown):string[] => Array.isArray(v) ? v.filter(x=>typeof x === 'string').slice(-100).map(text) : [];
const number = (v:unknown,min:number,max:number,fallback:number):number => typeof v === 'number' && Number.isFinite(v) ? Math.max(min,Math.min(max,v)) : fallback;
export function parseGame(raw:string|null,legacyRaw:string|null=null):GameState {
  const s = newGame();
  try {
    const v = JSON.parse(raw || 'null');
    if (v?.version === 2) {
      s.initialReason=text(v.initialReason); s.room=ROOM_IDS.includes(v.room) ? v.room : 'entry';
      s.view=['home','doors','room','ending'].includes(v.view) ? v.view : 'home';
      s.muted=v.muted===true; s.volume=number(v.volume,0,1,.35); s.events=strings(v.events).slice(-12); s.legacyNotes=strings(v.legacyNotes);
      for(const id of ROOM_IDS) {
        const r=v.rooms?.[id] || {}; const validIds=ROOMS[id].objects.map(o=>o.id);
        const chat:Message[]=Array.isArray(r.chat) ? r.chat.filter((m:Message)=>m && ['user','assistant'].includes(m.role) && text(m.content)).slice(-100).map((m:Message)=>({role:m.role,content:text(m.content),mode:['ai','authored','offline'].includes(m.mode || '') ? m.mode : undefined})) : [];
        s.rooms[id]={inspected:[...new Set(strings(r.inspected).filter(x=>validIds.includes(x)))],selected:[...new Set(strings(r.selected).filter(x=>validIds.includes(x)))],action:number(r.action,0,3,0),value:number(r.value,0,100,10),price:number(r.price,0,100000,200),changed:r.changed===true,adjusted:r.adjusted===true,note:text(r.note),notes:strings(r.notes).slice(-20),chat,completed:r.completed===true};
      }
      s.order=[...new Set(strings(v.order).filter(id=>ROOM_IDS.includes(id as RoomId) && s.rooms[id as RoomId].completed))] as RoomId[];
      for (const id of ROOM_IDS) if(s.rooms[id].completed && !s.order.includes(id)) s.order.push(id);
      if(!s.rooms.entry.completed && s.room !== 'entry') {s.room='entry';s.view='doors';}
      if(!canEnter(s,'freedom') && (s.room==='freedom' || s.view==='ending')) {s.room='entry';s.view='doors';}
      return s;
    }
  } catch { /* Try the older save without changing its stored value. */ }
  try {
    const old=JSON.parse(legacyRaw || 'null'); if(old?.version !== 1) return s;
    s.initialReason=text(old.initialReason); s.muted=old.muted===true;
    const notes=[text(old.firstThought),text(old.hypothesis),text(old.interpretation)].filter(Boolean);
    s.legacyNotes=[...notes,...strings(old.questions),...strings(old.episode?.events)];
    for(const [from,to] of [['stress','entry'],['ritual','ritual'],['loop','loop']] as const) {
      const r=s.rooms[to];
      r.chat=Array.isArray(old.chats?.[from]) ? old.chats[from].filter((m:Message)=>m && ['user','assistant'].includes(m.role) && text(m.content)).map((m:Message)=>({role:m.role,content:text(m.content),mode:m.mode})).slice(-100) : [];
      r.note=text(from==='stress' ? old.firstThought || old.episode?.observation : from==='ritual' ? old.hypothesis : old.interpretation);
      if(strings(old.discoveries).includes(from)) {r.completed=true; r.inspected=ROOMS[to].objects.map(o=>o.id);r.action=1;r.changed=true;if(r.note)r.notes=[r.note];s.order.push(to);}
    }
    if(s.initialReason || s.rooms.entry.chat.length) s.view='doors';
    return s;
  } catch {return s;}
}
export function completedThemes(s:GameState):number {return THEME_IDS.filter(id=>s.rooms[id].completed).length;}
export function canEnter(s:GameState,id:RoomId):boolean {return id==='entry' || (s.rooms.entry.completed && (id!=='freedom' || completedThemes(s)===THEME_IDS.length));}
export function availableDoors(s:GameState):RoomId[] {
  if(!s.rooms.entry.completed) return ['entry'];
  const last=s.order.at(-1) || 'entry';
  const entryRoute=s.initialReason.includes('успоко') || s.initialReason.includes('расслаб') ? ['stress','withdrawal','loop'] : s.initialReason.includes('просто курю') ? ['ritual','loop','origin'] : s.initialReason.includes('кофе') || s.initialReason==='Мне нравится' ? ['pleasure','ritual','company'] : ROOMS.entry.neighbours;
  const recommended=(last==='entry'?entryRoute as RoomId[]:ROOMS[last].neighbours).filter(id=>canEnter(s,id) && !s.rooms[id].completed);
  return [...new Set([...recommended,...THEME_IDS.filter(id=>!s.rooms[id].completed),...(canEnter(s,'freedom')?['freedom' as RoomId]:[])])];
}
export function enterRoom(s:GameState,id:RoomId,reason?:string):GameState {
  if(!canEnter(s,id)) return s;
  const initialReason=reason?.trim() || s.initialReason; const r=s.rooms[id];
  const content=r.completed ? `Раньше ты написал: «${r.note}». Что сейчас изменилось?` : id==='entry' ? entryOpening(initialReason) : ROOMS[id].opening;
  return {...s,initialReason,room:id,view:'room',rooms:{...s.rooms,[id]:{...r,chat:r.chat.length && !r.completed ? r.chat : [...r.chat,{role:'assistant',content,mode:'authored'}]}}};
}
const INSPECT_ONLY = new Set(['entry','pleasure','stress','loop','world']);
export function inspectObject(s:GameState,id:string):GameState {
  const room=ROOMS[s.room]; if(s.view!=='room' || !room.objects.some(o=>o.id===id) || !canEnter(s,s.room)) return s;
  const r=s.rooms[s.room];
  const inspected=[...new Set([...r.inspected,id])];
  if(INSPECT_ONLY.has(s.room)) {
    const next={...r,inspected};
    if(s.room==='stress') return {...s,rooms:{...s.rooms,stress:stressQuietState(next)}};
    return {...s,rooms:{...s.rooms,[s.room]:next}};
  }
  const selected=r.selected.includes(id) ? r.selected.filter(x=>x!==id) : [...r.selected,id];
  return {...s,rooms:{...s.rooms,[s.room]:{...r,selected,inspected}}};
}
function stressQuietState(r:RoomState):RoomState {
  const ready=r.value>=100 && r.inspected.includes('pause') && r.inspected.includes('cigarette');
  return ready ? {...r,action:1,changed:true} : r;
}
/** Items currently on the pleasure table. Before the first arrange, all three sit there. */
export function pleasureKept(s:GameState):string[] {
  const all=ROOMS.pleasure.objects.map(o=>o.id); const r=s.rooms.pleasure;
  if(r.action===0 && r.selected.length===0) return all;
  return r.selected.filter(id=>all.includes(id));
}
/** Florence-style table: keep 1–2 items on the table, drag the rest aside. */
export function arrangePleasureTable(s:GameState,keptIds:string[]):GameState {
  if(s.view!=='room' || s.room!=='pleasure' || !canEnter(s,'pleasure')) return s;
  const all=ROOMS.pleasure.objects.map(o=>o.id);
  const kept=[...new Set(keptIds.filter(id=>all.includes(id)))];
  const complete=kept.length>=1 && kept.length<=2;
  const r=s.rooms.pleasure;
  return {...s,rooms:{...s.rooms,pleasure:{...r,selected:kept,inspected:[...new Set([...r.inspected,...all])],action:complete?1:0,changed:r.changed||complete}}};
}
/** Entry: drag what matters out of the linked cluster into the keep zone. */
export function arrangeEntrySplit(s:GameState,keptIds:string[]):GameState {
  if(s.view!=='room' || s.room!=='entry' || !canEnter(s,'entry')) return s;
  const all=ROOMS.entry.objects.map(o=>o.id);
  const kept=[...new Set(keptIds.filter(id=>all.includes(id)))];
  const r=s.rooms.entry;
  const inspected=[...new Set([...r.inspected,...kept,...r.selected.filter(id=>!kept.includes(id))])];
  const complete=kept.length>0 && inspected.length>=2;
  return {...s,rooms:{...s.rooms,entry:{...r,selected:kept,inspected,action:complete?1:0,changed:r.changed||complete}}};
}
/** Stress: hold progress 0–100; silence lands when hold is full and pause+cigarette were seen. */
export function holdStressSilence(s:GameState,value:number):GameState {
  if(s.view!=='room' || s.room!=='stress' || !canEnter(s,'stress')) return s;
  const r=s.rooms.stress;
  const next=stressQuietState({...r,value:Math.max(0,Math.min(100,value)),adjusted:true});
  return {...s,rooms:{...s.rooms,stress:next}};
}
/** Loop: tear the ring after all three links were traced. */
export function tearLoop(s:GameState):GameState {
  if(s.view!=='room' || s.room!=='loop' || !canEnter(s,'loop')) return s;
  const r=s.rooms.loop; if(r.inspected.length<3) return s;
  return {...s,rooms:{...s.rooms,loop:{...r,action:1,changed:true}}};
}
/** World: swipe away one packaging layer. */
export function swipeWorldLayer(s:GameState):GameState {
  if(s.view!=='room' || s.room!=='world' || !canEnter(s,'world')) return s;
  return actInRoom(s);
}
export function actInRoom(s:GameState):GameState {
  if(s.view!=='room' || !canEnter(s,s.room))return s;
  const r=s.rooms[s.room]; const mechanic=ROOMS[s.room].mechanic;
  const action=mechanic==='unpack' ? Math.min(3,r.action+1) : r.action===0 ? 1 : 0;
  return {...s,rooms:{...s.rooms,[s.room]:{...r,action,changed:r.changed || action>0}}};
}
export function sceneReady(s:GameState,id:RoomId=s.room):boolean {
  const r=s.rooms[id], seen=(object:string)=>r.inspected.includes(object);
  if(!canEnter(s,id) || !r.changed)return false;
  switch(id){
    case 'entry':return r.inspected.length>=2 && r.selected.length>0;
    case 'pleasure':case 'ritual':return r.selected.length>0 && r.selected.length<3 && r.action>0;
    case 'stress':return seen('pause') && seen('cigarette');
    case 'origin':return seen('first') && seen('today');
    case 'company':return seen('friends') && r.selected.includes('place') && r.action>0;
    case 'loop':return r.inspected.length===3;
    case 'price':return seen('money') && r.action>0;
    case 'tomorrow':return r.adjusted && seen('now') && r.action>0;
    case 'withdrawal':return seen('help') && r.action>0;
    case 'world':return r.inspected.length===3 && r.action===3;
    case 'freedom':return r.inspected.length===3 && r.action>0;
  }
}
export function objectiveHint(s:GameState):string {
  if(sceneReady(s))return 'Сцена изменилась. Сохрани свою мысль, когда будешь готов.';
  switch(s.room){
    case 'entry':return 'Посмотри хотя бы две вещи. Перетащи вниз то, что держит тебя рядом с сигаретой.';
    case 'pleasure':return 'Перетащи со стола то, без чего пауза ещё возможна. Оставь одну или две вещи — стол изменится сам.';
    case 'ritual':return 'Выбери одну или две вещи, которые хочешь оставить. Остальные можно убрать. Затем измени сцену.';
    case 'stress':return 'Посмотри на передышку и сигарету, затем удерживай центр, пока шум не затихнет.';
    case 'origin':return 'Открой первую сигарету и сегодняшний взгляд, затем отмотай время.';
    case 'company':return 'Посмотри на людей, выбери своё место и погаси сигареты.';
    case 'loop':return 'Проследи все три звена, затем потяни круг в сторону, чтобы разомкнуть.';
    case 'price':return 'Посмотри на деньги, настрой расход и переключи расчёт на год.';
    case 'tomorrow':return 'Передвинь ползунок «потом», открой «Сейчас» и останови часы.';
    case 'withdrawal':return 'Открой «Помощь», затем окно. Силу бури можно менять.';
    case 'world':return 'Посмотри на три предмета, затем смахни слои с пачки.';
    case 'freedom':return 'Коснись трёх огней и открой выход.';
  }
}

export function noteCandidate(s:GameState,id:RoomId=s.room):string {const r=s.rooms[id];return r.note || [...r.chat].reverse().find(m=>m.role==='user')?.content || '';}
export function canComplete(s:GameState,id:RoomId=s.room):boolean {return sceneReady(s,id) && Boolean(noteCandidate(s,id).trim());}
export function completeRoom(s:GameState):GameState {
  if(!canComplete(s))return s;
  const id=s.room;const r=s.rooms[id];const note=noteCandidate(s).trim();
  const notes=r.notes.at(-1)===note ? r.notes : [...r.notes,note].slice(-20);
  return {...s,view:id==='freedom'?'ending':'doors',rooms:{...s.rooms,[id]:{...r,note,notes,completed:true}},order:[...s.order.filter(x=>x!==id),id],events:[...s.events,`${ROOMS[id].title}: ${ROOMS[id].reward}`].slice(-12)};
}
export function sceneSummary(s:GameState):string {
  const d=ROOMS[s.room],r=s.rooms[s.room];
  const chosen=r.selected.map(id=>d.objects.find(o=>o.id===id)?.label).filter(Boolean).join(', ') || 'ничего';
  return `${d.title}. Осмотрено: ${r.inspected.map(id=>d.objects.find(o=>o.id===id)?.label).join(', ')}. Выбрано: ${chosen}. Действие: ${r.action ? d.after : d.before}${d.mechanic==='price'?`. Сигарет в день: ${r.value}; цена пачки: ${r.price}; за год: ${Math.round(r.value/20*r.price*365)}`:''}. Это символическая сцена, не измерение здоровья или эффекта отказа.`;
}
export function dialogueContext(s:GameState):string[] {return [sceneSummary(s),...s.order.map(id=>`${ROOMS[id].title}: ${s.rooms[id].note}`)].filter(Boolean).slice(-12).map(x=>x.slice(0,600));}
export function exportGame(s:GameState):string {
  return ['ЛАБИРИНТ · МОИ ЗАПИСИ',`На входе: ${s.initialReason}`, ...s.order.map(id=>`${ROOMS[id].title}\n${s.rooms[id].notes.join('\n→ ')}`),...s.legacyNotes.map(x=>`Из прежнего пути: ${x}`),...ROOM_IDS.filter(id=>s.rooms[id].chat.length).map(id=>`\n${ROOMS[id].title}\n${s.rooms[id].chat.map(m=>`${m.role==='user'?'Я':m.mode==='offline'?'Подсказка':'Ответ'}: ${m.content}`).join('\n')}`)].join('\n\n');
}
