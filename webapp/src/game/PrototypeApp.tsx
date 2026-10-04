import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { LabyrinthAudio } from './audio';
import { askGuide, GUIDE_ISSUES } from './api';
import { canDiscover, context, discover, exportPrototype, newPrototype, opening, parsePrototype, PROTOTYPE_KEY, type Episode, type PrototypeRoom, type PrototypeState } from './prototypeState';
import './labyrinth.css';
import './prototype.css';
const PhaserStage = lazy(() => import('./PhaserStage').then(m => ({ default: m.PhaserStage })));
const ROOMS: Record<PrototypeRoom, { title: string; profile: string; action: string; reward: string }> = {
  stress: { title: 'Что держит', profile: 'stress', action: 'Моя запись', reward: 'Что помогло: сама сигарета или что-то ещё?' },
  ritual: { title: 'Разделение', profile: 'pleasure', action: 'Что было в перекуре', reward: 'Ты выбрал, что хочется оставить. А что будет иначе в другой ситуации?' },
  loop: { title: 'Повторение', profile: 'mirror', action: 'Другой перекур', reward: 'Есть два случая. Вернись к первому: ты всё ещё думаешь так же?' },
};
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (s: string) => void; placeholder?: string }) {
  return <label className="proto-field"><span>{label}</span><textarea maxLength={2000} rows={2} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} /></label>;
}
function EventList({ episode, onChange, title }: { episode: Episode; onChange: (e: Episode) => void; title: string }) {
  const [event, setEvent] = useState('');
  function add(e: FormEvent) { e.preventDefault(); if (!event.trim() || episode.events.length >= 12) return; onChange({ ...episode, events: [...episode.events, event.trim().slice(0, 160)] }); setEvent(''); }
  function move(index: number, offset: number) { const events = [...episode.events]; [events[index], events[index + offset]] = [events[index + offset], events[index]]; onChange({ ...episode, events }); }
  return <section className="proto-events"><h3>{title}</h3><p className="proto-hint">Что было сначала, что потом? По одной короткой фразе на строку.</p>
    <ol>{episode.events.map((item, i) => <li key={i}><input aria-label={`Событие ${i + 1}`} value={item} maxLength={160} onChange={e => onChange({ ...episode, events: episode.events.map((v,j) => j === i ? e.target.value : v) })} /><div className="proto-reorder"><button aria-label={`Поднять событие ${i+1}`} disabled={!i} onClick={() => move(i, -1)}>↑</button><button aria-label={`Опустить событие ${i+1}`} disabled={i === episode.events.length-1} onClick={() => move(i, 1)}>↓</button><button aria-label={`Удалить событие ${i+1}`} onClick={() => onChange({ ...episode, events: episode.events.filter((_,j) => j !== i) })}>×</button></div></li>)}</ol>
    <form onSubmit={add} className="proto-add"><input aria-label={`Добавить событие: ${title}`} placeholder="Например: вышел на балкон" value={event} maxLength={160} onChange={e => setEvent(e.target.value)} /><button disabled={!event.trim() || episode.events.length >= 12}>Добавить</button></form>
  </section>;
}
export function PrototypeApp() {
  const [s, set] = useState<PrototypeState>(() => { try { return parsePrototype(localStorage.getItem(PROTOTYPE_KEY)); } catch { return newPrototype(); } });
  const [tab, setTab] = useState<'chat' | 'scene'>('chat');
  const [draft, setDraft] = useState('');
  const [component, setComponent] = useState('');
  const [ownReason, setOwnReason] = useState('');
  const [customReason, setCustomReason] = useState(false);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [reset, setReset] = useState(false);
  const [journal, setJournal] = useState(false);
  const [transition, setTransition] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const sound = useRef<LabyrinthAudio>();
  const request = useRef<AbortController>();
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const end = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const room = ROOMS[s.room];
  const profile = s.view === 'home' || s.view === 'doors' ? 'corridor' : s.view === 'ending' ? 'freedom' : room.profile;
  const chat = s.chats[s.room];
  const canFinish = canDiscover(s, s.room);
  const lastDiscovery = s.discoveries.at(-1) || 'stress';
  useEffect(() => { sound.current = new LabyrinthAudio(); return () => { sound.current?.destroy(); request.current?.abort(); clearTimeout(timer.current); }; }, []);
  useEffect(() => { sound.current?.setRoom(profile); sound.current?.setMuted(s.muted); }, [profile, s.muted]);
  useEffect(() => { try { localStorage.setItem(PROTOTYPE_KEY, JSON.stringify(s)); setStorageError(false); } catch { setStorageError(true); } }, [s]);
  useEffect(() => { const media = matchMedia('(prefers-reduced-motion: reduce)'); const change = () => setReduced(media.matches); media.addEventListener('change',change); return () => media.removeEventListener('change',change); }, []);
  useEffect(() => { const v = window.visualViewport; if (!v) return; const resize = () => { if (v.scale === 1) { document.documentElement.style.setProperty('--lab-viewport-height', `${v.height}px`); document.documentElement.style.setProperty('--lab-viewport-top', `${v.offsetTop}px`); } }; resize(); v.addEventListener('resize', resize); v.addEventListener('scroll',resize); return () => { v.removeEventListener('resize',resize); v.removeEventListener('scroll',resize); document.documentElement.style.removeProperty('--lab-viewport-height'); document.documentElement.style.removeProperty('--lab-viewport-top'); }; }, []);
  useEffect(() => { if (tab === 'chat') end.current?.scrollIntoView({ block: 'nearest' }); }, [chat.length, busy, tab]);
  useEffect(() => { panel.current?.scrollTo(0,0); }, [s.room, tab, s.view, journal]);
  function patch(p: Partial<PrototypeState>) { set(old => ({ ...old, ...p })); }
  function cancel() { request.current?.abort(); request.current = undefined; setBusy(false); }
  function enter(id: PrototypeRoom, reason?: string) {
    cancel(); setDraft(''); setIssue(''); setTab('chat'); setJournal(false); setTransition(true); void sound.current?.unlock(); sound.current?.playDoor();
    set(old => ({ ...old, initialReason: reason || old.initialReason, room: id, view: 'room', chats: { ...old.chats, [id]: old.chats[id].length && !old.discoveries.includes(id) && !reason ? old.chats[id] : [...old.chats[id], { role: 'assistant', mode: 'authored', content: opening({ ...old, initialReason: reason || old.initialReason }, id) }] } }));
    clearTimeout(timer.current); timer.current = setTimeout(() => setTransition(false), reduced ? 0 : 650);
  }
  function confirm() {
    if (!canFinish) return;
    cancel(); set(old => discover(old, old.room)); sound.current?.playDiscovery();
  }
  function toDoors() { cancel(); patch({ view: 'doors' }); setJournal(false); }
  async function send(e?: FormEvent, retry = false) {
    e?.preventDefault(); if (busy) return;
    const history = s.chats[s.room];
    const index = history.map(m => m.role).lastIndexOf('user');
    const message = retry && index >= 0 ? history[index].content : draft.trim();
    if (!message) return;
    const previous = retry ? history.slice(0,index) : history;
    const id = s.room;
    const next = [...previous, { role: 'user' as const, content: message }];
    set(old => ({ ...old, chats: { ...old.chats, [id]: next } }));
    setDraft(''); setBusy(true); setIssue('');
    const control = new AbortController(); request.current = control;
    const timeout = setTimeout(() => control.abort(), 18000);
    try {
      const reply = await askGuide(id, message, previous, context(s), control.signal, s.initialReason || undefined);
      if (request.current !== control) return;
      if (reply.mode === 'ai') set(old => ({ ...old, chats: { ...old.chats, [id]: [...old.chats[id], { role: 'assistant', content: reply.response, mode: 'ai' }] } }));
      else { setIssue(GUIDE_ISSUES[reply.issue || ''] || 'Не удалось получить ответ.'); fallback(id); }
    } catch { if (request.current === control) { setIssue('Не удалось получить ответ. Твой ответ сохранён.'); fallback(id); } }
    finally { clearTimeout(timeout); if (request.current === control) { request.current = undefined; setBusy(false); } }
  }
  function fallback(id: PrototypeRoom) {
    const content = { stress: 'Ответить сейчас не получается. В «Моя запись» можно записать, чего тебе будет не хватать без сигареты и что в этом пока непонятно.', ritual: 'Открой «Что было в перекуре». Отметь всё, что там было: пауза, разговор, сигарета. Что из этого тебе хотелось бы оставить?', loop: 'Открой «Другой перекур». Вспомни ещё один случай. Стало легче так же или было иначе?' }[id];
    set(old => ({ ...old, chats: { ...old.chats, [id]: [...old.chats[id], { role: 'assistant', mode: 'offline', content }] } }));
  }
  function download() { const url = URL.createObjectURL(new Blob([exportPrototype(s)], { type: 'text/plain;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'labyrinth-my-story.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); }
  function addComponent(value: string) { const v = value.trim().slice(0,160); if (v && !s.components.includes(v) && s.components.length < 12) patch({ components: [...s.components,v] }); setComponent(''); }
  const doors = s.discoveries.includes('stress') ? (['ritual','loop','stress'] as PrototypeRoom[]) : (['stress'] as PrototypeRoom[]);
  return <main className={`lab-app proto-app ${reduced ? 'reduce-motion' : ''} proto-${profile}`}>
    <div className="lab-backdrop" style={{ backgroundImage: `url(/game/${profile}.webp)` }} />
    <Suspense fallback={null}><PhaserStage profile={profile} transitionKey={`${s.view}-${s.room}`} reducedMotion={reduced} onInspect={() => {}} inspectEnabled={false} /></Suspense>
    <div className="lab-shade" /><div className={`lab-transition ${transition ? 'active' : ''}`} aria-hidden="true" />
    <div className="proto-shell">
      <header className="proto-header"><button onClick={() => { cancel(); patch({ view: 'home' }); setJournal(false); }}>ZERO<span>SMOKE</span>WAY</button><div><button aria-label={s.muted ? 'Включить звук' : 'Выключить звук'} onClick={() => { void sound.current?.unlock(); patch({ muted: !s.muted }); }}>{s.muted ? '◌' : '♫'}</button><button onClick={() => { setJournal(!journal); }} aria-pressed={journal}>Журнал</button></div></header>
      {storageError && <p className="proto-warning" role="alert">Не удалось сохранить на устройстве. Скачай записи перед выходом.</p>}
      {journal ? <section className="proto-content" ref={panel}><p className="lab-eyebrow">ТВОИ ЗАПИСИ</p><h1>О чём ты говорил</h1><details className="proto-guide-info"><summary>О разговоре</summary><p>На твои сообщения отвечает AI. Сценарий опирается на идеи Аллена Карра; это не разговор с самим автором. Первые вопросы подготовлены заранее. Если связь пропадёт, появятся подсказки с отдельной подписью.</p></details><Story s={s} /><button className="lab-primary" onClick={download}>Скачать записи ↓</button><button className="lab-secondary" onClick={() => setJournal(false)}>Вернуться</button></section> : s.view === 'home' ? <section className="proto-home"><div><p className="lab-eyebrow">ЛАБИРИНТ</p><h1>Лабиринт<span>.</span></h1><p className="proto-tagline">Почему я возвращаюсь<br />к этой двери?</p></div><div><p>Игра о курении. За каждой дверью — разговор о том, что даёт тебе сигарета.</p><button className="lab-primary" onClick={() => { void sound.current?.unlock(); patch({ view: 'doors' }); }}> {s.chats.stress.length ? 'Продолжить' : 'Войти'} →</button>{s.chats.stress.length > 0 && <button className="lab-text-button" onClick={() => setReset(!reset)}>Начать заново</button>}{reset && <div className="proto-warning">Текущие записи будут удалены. <button onClick={download}>Сначала скачать</button><button onClick={() => { cancel(); set(newPrototype()); setReset(false); }}>Начать заново</button></div>}</div></section> : s.view === 'doors' ? <section className="proto-content" ref={panel}><p className="lab-eyebrow">{s.discoveries.length ? 'ДАЛЬШЕ' : 'ПЕРВАЯ ДВЕРЬ'}</p><h1>{s.discoveries.length ? 'Что хочешь понять дальше?' : 'Перед первой дверью'}</h1>{s.discoveries.length > 0 && <div className="proto-unlock" role="status"><span>КУДА ДАЛЬШЕ</span><p>{ROOMS[lastDiscovery].reward}</p><small>{lastDiscovery === 'stress' ? `Ты написал: ${s.firstThought || s.episode.moment}` : lastDiscovery === 'ritual' ? `Твой вопрос: ${s.hypothesis}` : `Ты написал: ${s.interpretation}`}</small></div>}
        {!s.discoveries.length && <section className="proto-intro" aria-labelledby="intro-title">
          <h2 id="intro-title">Ты знаешь, почему стоит бросить.</h2>
          <p>Но что-то держит тебя рядом с сигаретой. Этот лабиринт — про это.</p>
          <p>Выбери дверь. За ней начнётся разговор о том, чего тебе будет не хватать без сигареты. После разговора запиши то, что хочешь взять с собой, и открой следующую дверь.</p>
          <p className="proto-intro-note">В основе — идеи Аллена Карра. Записи сохраняются на этом устройстве.</p>
          {!s.initialReason && <div className="proto-start-choices"><h3>Если перестать курить, по чему ты будешь скучать?</h3>
            <button className="proto-reason" onClick={() => enter('stress', 'Сигарету с кофе или после еды')}>По сигарете с кофе или после еды <span>→</span></button>
            <button className="proto-reason" onClick={() => enter('stress', 'Возможность успокоиться')}>По возможности успокоиться <span>→</span></button>
            <button className="proto-reason" onClick={() => enter('stress', 'Не знаю. Я просто курю')}>Не знаю. Я просто курю <span>→</span></button>
            <button className="lab-text-button" onClick={() => setCustomReason(!customReason)}>Свой ответ +</button>
            {customReason && <form className="proto-own-reason" onSubmit={e => { e.preventDefault(); if (ownReason.trim()) enter('stress',ownReason.trim()); }}><Field label="Чего тебе будет не хватать?" value={ownReason} onChange={setOwnReason} placeholder="Своими словами" /><button className="lab-primary" disabled={!ownReason.trim()}>Открыть дверь →</button></form>}
          </div>}
        </section>}
        <div className="proto-doors">{(s.initialReason || s.discoveries.length ? doors : []).map((id,i) => <button key={id} className={`proto-door door-${id}`} onClick={() => enter(id)}><span className="proto-door-number">0{i+1} · {s.discoveries.includes(id) ? 'УЖЕ БЫЛ ЗДЕСЬ' : 'ДВЕРЬ'}</span><strong>{id === 'stress' ? s.discoveries.includes('stress') ? 'Вернуться к разговору' : s.initialReason || 'Продолжить разговор' : id === 'ritual' ? 'Что останется без сигареты?' : 'Бывает ли так каждый раз?'}</strong><small>{id === 'stress' ? s.episode.events.length ? s.episode.events.join(' → ') : 'Продолжить с того места, где остановился' : id === 'ritual' ? `Ты написал: ${s.firstThought || s.episode.moment}` : 'Вспомнить ещё один перекур'}</small><span>Войти →</span></button>)}</div>
        {s.discoveries.length > 0 && <button className="lab-secondary" onClick={() => patch({ view: 'ending' })}>Посмотреть записи →</button>}<p className="proto-hint"></p>
      </section> : s.view === 'ending' ? <section className="proto-content proto-ending" ref={panel}><p className="lab-eyebrow">ТВОЙ ВЫХОД</p><h1>На сегодня хватит?</h1><p className="proto-hint">Вот что ты записал. Если захочешь продолжить, двери остаются открыты.</p><Story s={s} /><Field label="О чём ещё хочешь подумать?" value={question} onChange={setQuestion} placeholder="Необязательно" /><button className="lab-secondary" disabled={!question.trim()} onClick={() => { patch({ questions: [...s.questions,question.trim()].slice(-30) }); setQuestion(''); }}>Сохранить вопрос</button><button className="lab-primary" onClick={download}>Скачать записи ↓</button><button className="lab-secondary" onClick={toDoors}>Вернуться к дверям →</button><button className="lab-text-button" onClick={() => patch({ view: 'home' })}>На сегодня достаточно</button></section> : <>
        <section className="proto-heading"><p className="lab-eyebrow">{s.room === 'stress' ? 'КОМНАТА 01' : s.room === 'ritual' ? 'КОМНАТА 02' : 'КОМНАТА 03'}</p><h1>{room.title}</h1><div className="proto-world" aria-label="Твои записи">{s.episode.events.slice(0,4).map((event,i) => <span key={i}>{event}</span>)}{s.discoveries.includes('ritual') && <span>✧ {s.components.length} деталей</span>}{s.discoveries.includes('loop') && <span>↔ {s.revisions.length} записей</span>}</div></section>
        <nav className="proto-tabs" aria-label="Режим комнаты"><button aria-pressed={tab === 'chat'} onClick={() => setTab('chat')}>Разговор</button><button aria-pressed={tab === 'scene'} onClick={() => setTab('scene')}>{room.action} {canFinish ? '✧' : '→'}</button></nav>
        {tab === 'chat' ? <section className="proto-chat"><div className="proto-messages" ref={panel} role="log" aria-label="Разговор">{chat.map((m,i) => <article className={`proto-message ${m.role}`} key={i}><span>{m.role === 'user' ? 'ТЫ' : m.mode === 'offline' ? 'ПОДСКАЗКА' : ''}</span><p>{m.content}</p></article>)}{busy && <p role="status" className="proto-hint">…</p>}<div ref={end} /></div>{issue && <div className="proto-warning" role="status">{issue}<button disabled={busy} onClick={() => void send(undefined,true)}>Повторить запрос</button><button onClick={() => setTab('scene')}>Открыть записи →</button></div>}<form className="proto-compose" onSubmit={e => void send(e)}><textarea aria-label="Твой ответ" placeholder="Напиши ответ…" rows={2} maxLength={2000} value={draft} onChange={e => setDraft(e.target.value)} /><button aria-label="Отправить ответ" disabled={busy || !draft.trim()}>↑</button></form><button className="proto-scene-link" onClick={() => setTab('scene')}>{room.action} →</button></section> : <section className="proto-content proto-workspace" ref={panel}>
          {s.room === 'stress' ? <><h3>Что хочешь записать после разговора?</h3><p className="proto-hint">То, что понял, с чем споришь или чего пока не понимаешь.</p><Field label="Моя запись" value={s.firstThought} onChange={firstThought => patch({ firstThought })} placeholder="Своими словами" /><details><summary>Разобрать один случай — необязательно</summary><EventList episode={s.episode} onChange={episode => patch({ episode })} title="Как это бывает у меня" /><Field label="Чего ждал от сигареты" value={s.episode.expectation} onChange={expectation => patch({ episode: { ...s.episode, expectation } })} /><Field label="Что получилось" value={s.episode.observation} onChange={observation => patch({ episode: { ...s.episode, observation } })} /></details></> : s.room === 'ritual' ? <><h3>Что было кроме сигареты?</h3><p className="proto-quote">«{s.firstThought || s.episode.moment}»</p><p className="proto-hint">Что рядом с сигаретой тебе нравится: кофе, пауза, общение? Выбери или добавь своё.</p><div className="proto-chips">{['Пауза','Выход из разговора','Свежий воздух','Одиночество','Общение','Движения рук','Курение'].filter(v => !s.components.includes(v)).map(v => <button key={v} onClick={() => addComponent(v)}>+ {v}</button>)}</div><form className="proto-add" onSubmit={e => { e.preventDefault(); addComponent(component); }}><input aria-label="Что ещё было?" value={component} maxLength={160} placeholder="Что ещё было?" onChange={e => setComponent(e.target.value)} /><button disabled={!component.trim()}>Добавить</button></form><div className="proto-components">{s.components.map(v => <div key={v}><span>{v}</span><button aria-pressed={s.keep.includes(v)} onClick={() => patch({ keep: s.keep.includes(v) ? s.keep.filter(c => c !== v) : [...s.keep,v] })}>{s.keep.includes(v) ? '✓ Хочу сохранить' : 'Хочу сохранить'}</button><button aria-label={`Убрать ${v}`} onClick={() => patch({ components: s.components.filter(c => c !== v), keep: s.keep.filter(c => c !== v) })}>×</button></div>)}</div><div className="proto-pair"><div><span>КАК БЫЛО</span><p>{s.components.join(' + ') || 'Пока ничего не выбрано'}</p></div><div><span>ЧТО ХОЧЕТСЯ ОСТАВИТЬ</span><p>{s.keep.join(' + ') || 'Пока не выбрано'}</p></div></div><Field label="Что здесь для тебя важно?" value={s.hypothesis} onChange={hypothesis => patch({ hypothesis })} placeholder="Например: хочу оставить паузу. Не знаю, хватит ли её без сигареты." />{s.discoveries.includes('loop') && <div className="proto-unlock"><span>В ДРУГОЙ РАЗ</span><p>{s.second.events.join(' → ')}</p><small>{s.interpretation}</small></div>}</> : <><h3>А в другой раз?</h3><div className="proto-unlock"><span>В ПЕРВЫЙ РАЗ</span><p>{s.episode.events.join(' → ') || s.firstThought}</p><small>Ожидал: {s.episode.expectation}<br />Заметил: {s.episode.observation}</small></div><EventList episode={s.second} onChange={second => patch({ second })} title="Ещё один перекур" /><Field label="Что заметил во втором случае?" value={s.second.observation} onChange={observation => patch({ second: { ...s.second,observation } })} placeholder="Что было похоже, а что иначе?" />{s.discoveries.includes('ritual') && <div className="proto-unlock"><span>В ПЕРВЫЙ РАЗ ТАМ БЫЛО</span><p>{s.components.join(' · ')}</p><small>Что из этого было и во втором случае?</small></div>}<h3>Получилось так же?</h3><div className="proto-chips">{['Похоже','Есть различие','Пока неясно','Не могу сравнить'].map(v => <button key={v} aria-pressed={s.comparison === v} onClick={() => patch({ comparison: v })}>{v}</button>)}</div><Field label="Что ты теперь об этом думаешь?" value={s.interpretation} onChange={interpretation => patch({ interpretation })} placeholder="Своими словами" />{s.revisions.length > 0 && <div className="proto-unlock"><span>РАНЬШЕ ТЫ НАПИСАЛ</span><p>{s.revisions.at(-1)}</p></div>}</>}
          <div className="proto-confirm"><p className="proto-hint">{canFinish ? '' : s.room === 'stress' ? s.firstThought.trim() ? 'Продолжи разговор: одной реплики пока мало, чтобы разобраться.' : 'Запиши то, что хочешь сохранить после разговора.' : s.room === 'ritual' ? 'Выбери, что было в перекуре, и напиши, что здесь для тебя важно.' : 'Напиши, что ты теперь думаешь. Если другой случай не вспоминается, нажми «Не могу сравнить».'}</p><button className="lab-primary" disabled={!canFinish} onClick={confirm}>Сохранить и идти дальше →</button><button className="lab-text-button" onClick={() => setTab('chat')}>Вернуться к разговору</button></div>
        </section>}
        <footer className="proto-footer"><button onClick={toDoors}>← Двери</button><span>{storageError ? 'НЕ СОХРАНЕНО' : 'СОХРАНЕНО'}</span>{s.discoveries.length > 0 && <button onClick={() => { cancel(); patch({ view: 'ending' }); }}>Мои записи →</button>}</footer>
      </>}
    </div>
  </main>;
}
function Story({ s }: { s: PrototypeState }) {
  return <div className="proto-story">{s.firstThought && <div><span>ПОСЛЕ ПЕРВОГО РАЗГОВОРА</span><p>{s.firstThought}</p></div>}<div><span>ЧТО ПРОИЗОШЛО</span><p>{s.episode.events.join(' → ') || 'Пока не записан'}</p><small>{s.episode.moment}</small></div><div><span>ЧЕГО ЖДАЛ / ЧТО ПОЛУЧИЛОСЬ</span><p>{s.episode.expectation || '—'}</p><p>{s.episode.observation || '—'}</p></div>{s.components.length > 0 && <div><span>ЧТО ЕЩЁ БЫЛО</span><p>{s.components.join(' · ')}</p><small>Хочу сохранить: {s.keep.join(', ') || 'Пока не выбрано'}</small></div>}{s.hypothesis && <div><span>ЧТО ТЕБЕ ВАЖНО</span><p>{s.hypothesis}</p></div>}{s.interpretation && <div><span>ЧТО ДУМАЕШЬ СЕЙЧАС</span><p>{s.interpretation}</p><small>{s.comparison}</small></div>}{s.revisions.length > 1 && <div><span>ЧТО ПИСАЛ РАНЬШЕ</span>{s.revisions.slice(0,-1).map((v,i) => <p key={i}>{v}</p>)}</div>}{s.questions.length > 0 && <div><span>О ЧЁМ ЕЩЁ ПОДУМАТЬ</span>{s.questions.map((q,i) => <p key={i}>{q}</p>)}</div>}<details><summary>Разговоры</summary>{(['stress','ritual','loop'] as PrototypeRoom[]).map(id => s.chats[id].length > 0 && <section key={id}><h3>{ROOMS[id].title}</h3>{s.chats[id].map((m,i) => <p key={i}><small>{m.role === 'user' ? 'ТЫ' : m.mode === 'offline' ? 'ПОДСКАЗКА' : ''}</small><br />{m.content}</p>)}</section>)}</details></div>;
}
