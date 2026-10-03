import { FormEvent, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { ROOMS, ROOM_ORDER } from './content';
import { LabyrinthAudio } from './audio';
import { askGuide, GUIDE_ISSUES } from './api';
import { doorDestinations, exportJourney, newJourney, parseJourney, SAVE_KEY, newRoomProgress, canCompleteRoom, type JourneyState } from './state';
import './labyrinth.css';

const PhaserStage = lazy(() => import('./PhaserStage').then(module => ({ default: module.PhaserStage })));
type Overlay = 'settings' | 'journal' | 'chat' | 'custom' | 'routes' | 'archive' | null;
function Icon({ name }: { name: 'arrow' | 'back' | 'sound' | 'mute' | 'book' | 'close' | 'settings' | 'chat' | 'eye' | 'check' }) {
  const paths = {
    arrow: 'M4 12h15m-6-6 6 6-6 6', back: 'M20 12H5m6-6-6 6 6 6', sound: 'M11 4 6 8H3v8h3l5 4V4Zm4 4c3 2 3 6 0 8m3-11c5 4 5 10 0 14', mute: 'M11 4 6 8H3v8h3l5 4V4Zm5 5 5 6m0-6-5 6', book: 'M4 4h6l2 2 2-2h6v15h-6l-2 2-2-2H4V4Zm8 2v15', close: 'm6 6 12 12M18 6 6 18', settings: 'M4 7h16M4 17h16M8 4v6m8 4v6', chat: 'M4 4h16v13H9l-5 4V4Z', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6', check: 'm5 12 4 4L19 6',
  };
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
function Mark() {
  return <svg className="lab-mark" width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 36C11 36 4 29 4 20S11 4 20 4s16 7 16 16c0 7-5 12-12 12H12V12h16v12H20v-4" stroke="currentColor" strokeWidth="1.3" /><path d="M20 8v4M8 20h4M28 20h8M20 28v8" stroke="currentColor" strokeWidth="1.3" /></svg>;
}
const initialState = () => {
  try { return parseJourney(localStorage.getItem(SAVE_KEY)) || newJourney(); } catch { return newJourney(); }
};

export function LabyrinthApp() {
  const [state, setState] = useState<JourneyState>(initialState);
  const [playing, setPlaying] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [draft, setDraft] = useState('');
  const [customAnswer, setCustomAnswer] = useState('');
  const [noteDraft, setNoteDraft] = useState(() => state.notes[state.roomId] || '');
  const [journalRoomId, setJournalRoomId] = useState('pleasure');
  const [busy, setBusy] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [systemReduced, setSystemReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const audio = useRef<LabyrinthAudio | null>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout>>();
  const controller = useRef<AbortController | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const uiRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const room = ROOMS.find(item => item.id === state.roomId) || ROOMS[0];
  const reducedMotion = state.reducedMotion || systemReduced;
  const profile = !playing || state.view === 'lobby' ? 'corridor' : state.view === 'ending' ? 'freedom' : room.profile;
  const roomChat = state.chats[room.id] || [];
  const progress = state.progress[room.id] || newRoomProgress();
  const canFinish = canCompleteRoom(state, room.id);
  const requiredCompleted = ROOM_ORDER.filter(id => state.completed.includes(id)).length;
  const journalRoom = ROOMS.find(item => item.id === journalRoomId) || ROOMS[0];
  const phaseLabel = { explore: 'Разбираем конкретный эпизод', compare: 'Сравниваем ожидание и результат', reflect: 'Формулируем твой вывод', ready: 'Собраны твой пример и вывод' }[progress.phase];
  const latestGuide = [...roomChat].reverse().find(line => line.role === 'assistant');
  const retryAvailable = latestGuide?.mode === 'offline' || Boolean(latestGuide?.issue);
  const roomNumber = ROOM_ORDER.indexOf(room.id) + 1;
  const destinations = doorDestinations(state.completed, state.view === 'room' ? room.id : undefined);

  useEffect(() => {
    const sound = new LabyrinthAudio();
    audio.current = sound;
    return () => { sound.destroy(); audio.current = null; clearTimeout(transitionTimer.current); controller.current?.abort(); };
  }, []);
  useEffect(() => { audio.current?.setRoom(profile); audio.current?.setMuted(state.muted); audio.current?.setVolume(state.volume); }, [profile, state.muted, state.volume]);
  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, updatedAt: new Date().toISOString() })); setStorageWarning(false); }
    catch { setStorageWarning(true); }
  }, [state]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setSystemReduced(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const resize = () => {
      if (viewport.scale !== 1) return;
      document.documentElement.style.setProperty('--lab-viewport-height', `${viewport.height}px`);
      document.documentElement.style.setProperty('--lab-viewport-top', `${viewport.offsetTop}px`);
    };
    resize();
    viewport.addEventListener('resize', resize);
    viewport.addEventListener('scroll', resize);
    return () => {
      viewport.removeEventListener('resize', resize);
      viewport.removeEventListener('scroll', resize);
      document.documentElement.style.removeProperty('--lab-viewport-height');
      document.documentElement.style.removeProperty('--lab-viewport-top');
    };
  }, []);
  useEffect(() => {
    if (uiRef.current) uiRef.current.inert = Boolean(overlay);
    if (!overlay) { lastFocus.current?.focus(); return; }
    lastFocus.current = document.activeElement as HTMLElement;
    const element = modalRef.current;
    const timer = setTimeout(() => element?.querySelector<HTMLElement>('button, input, textarea')?.focus(), 40);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOverlay(null); return; }
      if (event.key !== 'Tab' || !element) return;
      const focusable = [...element.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea, a[href]')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { clearTimeout(timer); document.removeEventListener('keydown', keydown); };
  }, [overlay]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' }); }, [state.chats, busy]);
  useEffect(() => { if (overlay !== 'chat') { controller.current?.abort(); controller.current = null; setBusy(false); } }, [overlay]);

  function start(resume: boolean) {
    void audio.current?.unlock();
    if (!resume) {
      setState(previous => ({ ...newJourney(), started: true, muted: previous.muted, volume: previous.volume, reducedMotion: previous.reducedMotion }));
    }
    setPlaying(true);
  }
  function enterRoom(id: string, chosenReason?: string) {
    if (transitioning) return;
    if (state.completed.includes(id)) { setJournalRoomId(id); setOverlay('archive'); return; }
    setOverlay(null);
    controller.current?.abort(); controller.current = null; setBusy(false); setDraft('');
    setTransitioning(true);
    audio.current?.playDoor();
    transitionTimer.current = setTimeout(() => {
      setState(previous => {
        const destination = ROOMS.find(item => item.id === id)!;
        const reason = chosenReason || destination.title;
        const opening = `Ты выбрал дверь «${reason}». Давай разберём именно это.\n\n${destination.opening}`;
        return { ...previous, started: true, view: 'room', roomId: id, stage: 'conversation',
          chats: { ...previous.chats, [id]: previous.chats[id]?.length ? previous.chats[id] : [{ role: 'assistant' as const, content: opening, mode: 'authored' as const }] } };
      });
      setNoteDraft(state.notes[id] || '');
      transitionTimer.current = setTimeout(() => setTransitioning(false), reducedMotion ? 80 : 600);
    }, reducedMotion ? 80 : 320);
  }
  function inspect() { /* The conversation begins as soon as the door opens. */ }
  function finishConversation() {
    if (busy || !canFinish) return;
    const ownWords = roomChat.filter(line => line.role === 'user').map(line => line.content);
    setNoteDraft(state.notes[room.id] || progress.evidence.conclusion || ownWords.at(-1) || '');
    setState(previous => ({ ...previous, stage: 'doors',
      notes: { ...previous.notes, [room.id]: previous.notes[room.id] || progress.evidence.conclusion || ownWords.at(-1) || '' },
      completed: [...new Set([...previous.completed, room.id])] }));
    audio.current?.playDiscovery();
  }
  function saveNote() {
    setState(previous => ({ ...previous, notes: { ...previous.notes, [room.id]: noteDraft.trim().slice(0, 2000) } }));
  }
  function custom() { setCustomAnswer(''); setOverlay('custom'); }
  function submitCustom(event: FormEvent) {
    event.preventDefault();
    const value = customAnswer.trim();
    if (!value) return;
    setState(previous => ({ ...previous, initialReason: value })); enterRoom('personal', value);
  }
  async function sendChat(event: FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setDraft('');
    await deliver(message, state.chats[room.id] || [], true);
  }
  async function retryChat() {
    if (busy) return;
    const history = state.chats[room.id] || [];
    const index = history.map(line => line.role).lastIndexOf('user');
    if (index >= 0) await deliver(history[index].content, history.slice(0, index), false);
  }
  async function deliver(message: string, history: typeof roomChat, append: boolean) {
    const roomId = room.id;
    setBusy(true);
    const request = new AbortController();
    controller.current = request;
    if (append) setState(previous => ({ ...previous, chats: { ...previous.chats, [roomId]: [...history, { role: 'user', content: message }] } }));
    const timeout = setTimeout(() => request.abort('timeout'), 20000);
    try {
      const reply = await askGuide(roomId, message, history, Object.values(state.notes), request.signal, roomId === 'personal' ? state.initialReason : undefined);
      if (controller.current !== request) return;
      setState(previous => ({ ...previous, progress: { ...previous.progress, [roomId]: reply.progress }, chats: { ...previous.chats, [roomId]: [...(previous.chats[roomId] || []), { role: 'assistant' as const, content: reply.response, mode: reply.mode, issue: reply.issue }] } }));
    } catch {
      if (controller.current !== request) return;
      setState(previous => ({ ...previous, progress: { ...previous.progress, [roomId]: { ...(previous.progress[roomId] || newRoomProgress()), ready: false } }, chats: { ...previous.chats, [roomId]: [...(previous.chats[roomId] || []), { role: 'assistant' as const, content: 'Сейчас связь с ведущим недоступна. Твой ответ сохранён. Повтори запрос, когда связь вернётся, или сделай паузу — комната пока не отмечается пройденной.', mode: 'offline' as const }] } }));
    } finally { clearTimeout(timeout); if (controller.current === request) { controller.current = null; setBusy(false); } }
  }
  function downloadNotes() {
    const url = URL.createObjectURL(new Blob([exportJourney(state)], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'labyrinth-my-notes.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function reset() {
    controller.current?.abort(); controller.current = null;
    clearTimeout(transitionTimer.current); setTransitioning(false); setBusy(false);
    setState(previous => ({ ...newJourney(), muted: previous.muted, volume: previous.volume, reducedMotion: previous.reducedMotion }));
    setPlaying(false); setOverlay(null); setResetConfirm(false);
  }

  return <main className={`lab-app theme-${profile} ${reducedMotion ? 'reduce-motion' : ''}`}>
    <div className="lab-backdrop" style={{ backgroundImage: `url(/game/${profile}.webp)` }} />
    <Suspense fallback={null}><PhaserStage profile={profile} transitionKey={`${playing}-${state.view}-${room.id}`} reducedMotion={reducedMotion} onInspect={inspect} inspectEnabled={false} /></Suspense>
    <div className="lab-shade" />
    <div className={`lab-transition ${transitioning ? 'active' : ''}`} aria-hidden="true" />
    <div className="lab-ui" ref={uiRef}>
      <header className="lab-header">
        <button className="lab-brand" aria-label="На главный экран" onClick={() => setPlaying(false)}><Mark /><span>ZERO<span className="brand-light">SMOKE</span>WAY</span></button>
        <div className="header-actions">
          {playing && <button className="lab-icon" aria-label="Мои записи" onClick={() => setOverlay('journal')}><Icon name="book" /></button>}
          <button className="lab-icon" aria-label={state.muted ? 'Включить звук' : 'Выключить звук'} onClick={() => { void audio.current?.unlock(); setState(previous => ({ ...previous, muted: !previous.muted })); }}><Icon name={state.muted ? 'mute' : 'sound'} /></button>
          <button className="lab-icon" aria-label="Настройки" onClick={() => { setResetConfirm(false); setOverlay('settings'); }}><Icon name="settings" /></button>
        </div>
      </header>

      {!playing ? <section className="lab-home">
        <div className="home-title"><div className="lab-eyebrow"><span className="tiny-line" /> ИНТЕРАКТИВНАЯ ИСТОРИЯ</div><h1>Лабиринт<span className="title-dot">.</span></h1><p className="home-tagline">У каждой привычки<br />есть выход.</p></div>
        <div className="home-bottom"><div className="home-description"><span className="home-cross">✧</span><p>Открой двери своей привычки.<br />Найди ответы, которые принадлежат тебе.</p></div>
          {state.started && <button className="lab-primary" onClick={() => start(true)}>Продолжить путь <Icon name="arrow" /></button>}
          <button className={state.started ? 'lab-secondary' : 'lab-primary'} onClick={() => { if (state.started) { setResetConfirm(true); setOverlay('settings'); } else start(false); }}>{state.started ? 'Начать заново' : 'Войти в лабиринт'} {!state.started && <Icon name="arrow" />}</button>
          <div className="home-meta"><span>11 КОМНАТ · В ТВОЁМ ТЕМПЕ</span><span>ЛУЧШЕ СО ЗВУКОМ <span aria-hidden="true">◖◗</span></span></div>
          <p className="home-footnote">Квест о курении и свободе выбора</p>
        </div>
      </section> : <>
        <div className="journey-progress" aria-label={`Исследовано ${requiredCompleted} из ${ROOM_ORDER.length} комнат`}>{ROOM_ORDER.map(id => <span key={id} className={state.completed.includes(id) ? 'done' : state.view === 'room' && room.id === id ? 'current' : ''} />)}</div>
        {state.view === 'lobby' ? <section className="lab-lobby">
          <div className="room-heading"><div className="lab-eyebrow">ПЕРВАЯ РАЗВИЛКА</div><h1>Почему<br />я курю<span className="title-dot">?</span></h1><p>Выбери дверь, которая ближе тебе сейчас.</p></div>
          <div className="door-choices first-doors">
            <button className="door-choice" disabled={transitioning} onClick={() => { setState(previous => ({ ...previous, initialReason: 'Мне нравится' })); enterRoom('pleasure', 'Мне нравится'); }}><span className="door-glyph" aria-hidden="true">◯</span><span>Мне<br />нравится</span><span className="door-number">01</span></button>
            <button className="door-choice" disabled={transitioning} onClick={() => { setState(previous => ({ ...previous, initialReason: 'Помогает справляться' })); enterRoom('stress', 'Помогает справляться'); }}><span className="door-glyph" aria-hidden="true">☼</span><span>Помогает<br />справляться</span><span className="door-number">02</span></button>
            <button className="door-choice" disabled={transitioning} onClick={custom}><span className="door-glyph" aria-hidden="true">◇</span><span>Моя<br />причина</span><span className="door-number">03</span></button>
          </div>
          <div className="lobby-bottom"><span className="whisper-line" /><p>Здесь можно сомневаться.<br />И идти своим путём.</p><span className="lab-eyebrow">КОСНИСЬ ДВЕРИ</span></div>
        </section> : state.view === 'ending' ? <section className="lab-ending">
          <div className="room-heading"><div className="lab-eyebrow">ПО ТУ СТОРОНУ</div><h1>Выход<br />открыт<span className="title-dot">.</span></h1><p>Ты прошёл лабиринт.<br />Следующий шаг принадлежит тебе.</p></div>
          <div className="ending-bottom"><p className="ending-thought">{state.notes.freedom || 'Можно взять с собой открытия. Можно оставить вопросы открытыми.'}</p><button className="lab-primary" onClick={downloadNotes}>Забрать свои записи <Icon name="arrow" /></button><button className="lab-secondary" onClick={() => setOverlay('chat')}>Поговорить с ведущим <Icon name="chat" /></button><button className="lab-text-button" onClick={() => setOverlay('journal')}>Вернуться к пройденным комнатам</button><p className="save-caption">{storageWarning ? 'Сохранение недоступно — скачай записи перед выходом.' : 'Твой путь сохранён в этом браузере.'}</p></div>
        </section> : <section className="lab-room" aria-label={room.title}>
          <div className="room-heading" key={room.id}><div className="lab-eyebrow"><span className="room-index">{room.id === 'personal' ? 'ТВОЯ' : String(roomNumber).padStart(2, '0')}</span> / КОМНАТА</div><h1>{room.title}</h1><p>{room.subtitle}</p></div>
          <div className={`room-panel ${state.stage !== 'doors' ? 'conversation-panel' : ''}`}>
            {state.stage !== 'doors' && <>
              <div className="conversation-label"><span className="guide-label"><span /> РАЗГОВОР ЗА ДВЕРЬЮ</span><span>Обсуждаем эту дверь</span></div>
              <div className="chat-scroll room-chat-scroll" aria-live="polite">
                {!roomChat.length && <div className="chat-line assistant"><div className="chat-name">ВЕДУЩИЙ</div><p>{room.opening}</p></div>}
                {roomChat.map((line, index) => <div className={`chat-line ${line.role}`} key={index}><div className="chat-name">{line.role === 'user' ? 'ТЫ' : line.mode === 'ai' ? 'AI-ВЕДУЩИЙ' : line.mode === 'offline' ? 'СВЯЗЬ НЕДОСТУПНА' : line.issue ? 'ВЕДУЩИЙ НЕДОСТУПЕН' : 'ВЕДУЩИЙ'}</div><p>{line.content}</p></div>)}
                {busy && <div className="chat-thinking" role="status">Ведущий слушает…</div>}<div ref={chatEnd} />
              </div>
              <form className="chat-composer room-chat-composer" onSubmit={sendChat}><textarea aria-label="Сообщение ведущему" placeholder="Расскажи, как это у тебя…" value={draft} maxLength={2000} rows={2} onChange={event => setDraft(event.target.value)} /><button className="lab-icon" type="submit" disabled={busy || !draft.trim() || transitioning} aria-label="Отправить сообщение"><Icon name="arrow" /></button></form>
              <div className="dialogue-progress" aria-label="Ход разговора"><span>{phaseLabel}</span><div>{(['episode','expectation','observation','conclusion'] as const).map((key, index) => <i key={key} className={progress.evidence[key] ? 'found' : ''} aria-label={`${['Личный эпизод','Ожидание','Наблюдение','Свой вывод'][index]}: ${progress.evidence[key] ? 'есть' : 'впереди'}`} />)}</div></div>
              {retryAvailable && <div className="guide-retry"><p>{latestGuide?.issue ? GUIDE_ISSUES[latestGuide.issue] || 'Ведущий временно недоступен.' : 'Нет связи с сервером.'} Твой ответ сохранён.</p><button className="lab-secondary" disabled={busy} onClick={() => { void retryChat(); }}>Повторить запрос</button></div>}
              <div className="conversation-exit"><button className="lab-text-button" disabled={busy || !canFinish} onClick={finishConversation}>Сохранить вывод и открыть двери <Icon name="arrow" /></button></div>
              <button className="lab-text-button dialogue-pause" disabled={busy} onClick={() => setPlaying(false)}>Сохранить и продолжить позже</button>
              <p className="chat-footnote">Двери откроются после личного примера, сравнения и твоего вывода. Согласие с ведущим не требуется.</p>
            </>}
            {state.stage === 'doors' && <><div className="guide-label"><Icon name="check" /> ФРАГМЕНТ ПУТИ СОХРАНЁН</div><h2 className="step-prompt">Что оставишь в своих записях?</h2><textarea aria-label="Моя заметка о комнате" className="lab-note" value={noteDraft} maxLength={2000} rows={2} onChange={event => { const value = event.target.value; setNoteDraft(value); setState(previous => ({ ...previous, notes: { ...previous.notes, [room.id]: value } })); }} onBlur={saveNote} placeholder="Можно оставить вопрос открытым…" />
              {destinations.length ? <><p className="next-door-caption">Куда пойдёшь дальше?</p><div className="next-doors">{destinations.slice(0, 3).map(id => { const next = ROOMS.find(r => r.id === id)!; return <button className="next-door" key={id} disabled={transitioning} onClick={() => { saveNote(); enterRoom(id); }}><span className="next-door-number">{String(ROOM_ORDER.indexOf(id) + 1).padStart(2, '0')}</span><span>{next.title}</span><Icon name="arrow" /></button>; })}</div>{destinations.length > 3 && <button className="lab-text-button" onClick={() => setOverlay('routes')}>Выбрать другую дверь ({destinations.length - 3}) ↗</button>}</> : <button className="lab-primary" onClick={() => { saveNote(); audio.current?.playDiscovery(); setState(previous => ({ ...previous, view: 'ending' })); }}>Выйти из лабиринта <Icon name="arrow" /></button>}
            </>}
          </div>
          <footer className="room-footer"><button onClick={() => setOverlay('journal')}><Icon name="book" /><span>Мои записи</span></button><span className="room-saved">{storageWarning ? 'БЕЗ СОХРАНЕНИЯ' : 'ПУТЬ СОХРАНЯЕТСЯ'}</span><span className="room-saved">{state.stage === 'doors' ? 'ВЫБЕРИ ДВЕРЬ' : 'ДИАЛОГ'}</span></footer>
        </section>}
      </>}
    </div>

    {overlay && <div className={`lab-modal-backdrop overlay-${overlay}`} onClick={event => { if (event.target === event.currentTarget) setOverlay(null); }}><div ref={modalRef} className={`lab-modal ${overlay === 'chat' ? 'chat-modal' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-heading"><div><div className="lab-eyebrow">ЛАБИРИНТ</div><h2 id="modal-title">{overlay === 'settings' ? 'Настройки' : overlay === 'journal' ? 'Мои записи' : overlay === 'chat' ? 'Разговор с ведущим' : overlay === 'routes' ? 'Доступные двери' : overlay === 'archive' ? journalRoom.title : 'Моя причина'}</h2></div><button className="lab-icon" aria-label="Закрыть" onClick={() => setOverlay(null)}><Icon name="close" /></button></div>
      {overlay === 'settings' && <div className="modal-body"><label className="setting-row"><span>Музыка и атмосфера</span><input type="checkbox" checked={!state.muted} onChange={event => { void audio.current?.unlock(); setState(previous => ({ ...previous, muted: !event.target.checked })); }} /></label><label className="setting-volume">Громкость <span>{Math.round(state.volume * 100)}%</span><input aria-label="Громкость" type="range" min="0" max="1" step="0.05" value={state.volume} onChange={event => setState(previous => ({ ...previous, volume: Number(event.target.value) }))} /></label><label className="setting-row"><span>Меньше движения</span><input type="checkbox" checked={reducedMotion} disabled={systemReduced} onChange={event => setState(previous => ({ ...previous, reducedMotion: event.target.checked }))} /></label><p className="setting-description">Без параллакса и частиц, с короткими переходами.</p><div className="settings-rule" /><p className="setting-description">{storageWarning ? 'Браузер не разрешает сохранение. Скачай записи, чтобы их не потерять.' : 'Прогресс хранится на этом устройстве, в этом браузере. Можно закрыть игру и продолжить позже.'}</p><button className="lab-secondary" onClick={downloadNotes}>Скачать записи <Icon name="book" /></button><div className="reset-block">{resetConfirm ? <><p>Начать новый путь? Сохранённые ответы этого квеста будут удалены.</p><button className="lab-danger" onClick={reset}>Да, начать заново</button><button className="lab-text-button" onClick={() => setResetConfirm(false)}>Оставить мой путь</button></> : <button className="lab-text-button" onClick={() => setResetConfirm(true)}>Начать заново</button>}</div></div>}
      {overlay === 'journal' && <div className="modal-body"><p className="journal-intro">{state.completed.length ? `${requiredCompleted} из ${ROOM_ORDER.length} комнат исследовано. Здесь остаются твои версии — их можно пересмотреть.` : 'Здесь появятся твои находки и ответы. Для выхода не нужно соглашаться с ведущим.'}</p>{state.initialReason && <blockquote className="journal-reason">«{state.initialReason}»<span>МОЯ ПЕРВАЯ ПРИЧИНА</span></blockquote>}<div className="journal-list">{ROOMS.filter(item => item.id !== 'personal' || state.chats.personal?.length || state.completed.includes('personal')).map((item, index) => <div key={item.id} className={`journal-item ${state.completed.includes(item.id) ? 'visited' : ''}`}><span className="journal-number">{item.id === 'personal' ? 'Л' : String(index + 1).padStart(2, '0')}</span><div><h3>{item.title}</h3>{state.completed.includes(item.id) ? <><p>{state.notes[item.id] || 'Личная заметка не записана.'}</p><button className="lab-text-button" onClick={() => { setJournalRoomId(item.id); setOverlay('archive'); }}>Посмотреть разговор ↗</button></> : <p>Ещё впереди</p>}</div>{state.completed.includes(item.id) && <Icon name="check" />}</div>)}</div><button className="lab-secondary" onClick={downloadNotes}>Забрать записи <Icon name="arrow" /></button></div>}
      {overlay === 'routes' && <div className="modal-body"><p className="journal-intro">Ближайшие комнаты показаны первыми. Можно выбрать любую открытую тему.</p><div className="route-list">{destinations.map(id => { const next = ROOMS.find(item => item.id === id)!; return <button className="next-door" key={id} onClick={() => { saveNote(); enterRoom(id); }}><span>{next.title}<small>{next.subtitle}</small></span><Icon name="arrow" /></button>; })}</div></div>}
      {overlay === 'archive' && <div className="modal-body"><p className="journal-intro">Это сохранённый разговор. Просмотр не меняет твой путь.</p>{state.progress[journalRoom.id]?.legacy && <p className="setting-description">Комната пройдена в предыдущей версии игры.</p>}<blockquote className="journal-reason">{state.notes[journalRoom.id] || 'Без отдельной заметки'}</blockquote>{(state.chats[journalRoom.id] || []).map((line,index) => <div className={`chat-line ${line.role}`} key={index}><div className="chat-name">{line.role === 'user' ? 'ТЫ' : 'ВЕДУЩИЙ'}</div><p>{line.content}</p></div>)}<button className="lab-secondary" onClick={() => setOverlay('journal')}>Назад к записям</button></div>}
      {overlay === 'custom' && <form className="modal-body custom-form" onSubmit={submitCustom}><p>Как ты сейчас объясняешь своё курение? За этой дверью обсудим именно твою причину.</p><textarea aria-label="Моя причина курения" placeholder="Твоими словами…" value={customAnswer} maxLength={2000} rows={4} onChange={event => setCustomAnswer(event.target.value)} /><button className="lab-primary" disabled={!customAnswer.trim()} type="submit">Открыть мою дверь <Icon name="arrow" /></button></form>}
      {overlay === 'chat' && <><div className="chat-context"><span className="chat-signal" />{room.title}<span>Текстовый диалог</span></div><div className="chat-scroll" aria-live="polite"><p className="chat-welcome">Можно обсудить сомнение или конкретный эпизод. Для живого разговора требуется связь с AI-ведущим.</p>{(state.chats[room.id] || []).map((line, index) => <div className={`chat-line ${line.role}`} key={index}><div className="chat-name">{line.role === 'user' ? 'ТЫ' : line.mode === 'ai' ? 'AI-ВЕДУЩИЙ' : line.mode === 'offline' ? 'СВЯЗЬ НЕДОСТУПНА' : line.issue ? 'ВЕДУЩИЙ НЕДОСТУПЕН' : 'ВЕДУЩИЙ'}</div><p>{line.content}</p></div>)}{busy && <div className="chat-thinking" role="status">Ведущий слушает<span>…</span></div>}<div ref={chatEnd} /></div><form className="chat-composer" onSubmit={sendChat}><textarea aria-label="Сообщение ведущему" placeholder="Что хочешь обсудить?" value={draft} maxLength={2000} rows={2} onChange={event => setDraft(event.target.value)} /><button className="lab-icon" type="submit" disabled={busy || !draft.trim()} aria-label="Отправить сообщение"><Icon name="arrow" /></button></form><p className="chat-footnote">Текст отправляется на сервер для ответа. Без AI доступен авторский ведущий.</p></>}
    </div></div>}
  </main>;
}
