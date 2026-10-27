import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { FIRST_SCENE, sceneOf, type SceneId, type Phase } from '../catalog';
import { askScene, type ChatLine } from './api';
import './scene1.css';

const CinematicStage = lazy(() => import('./CinematicStage').then(m => ({ default: m.CinematicStage })));

export function Scene1App() {
  const [sceneId, setSceneId] = useState<SceneId>(FIRST_SCENE);
  const scene = sceneOf(sceneId);
  const [play, setPlay] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState('');
  const [canAdvance, setCanAdvance] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const request = useRef<AbortController>();
  const end = useRef<HTMLDivElement>(null);
  const kickoffFor = useRef(-1);
  const saveKey = `zsw_act${scene.act}_scene${scene.number}_v1`;

  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(m.matches);
    m.addEventListener('change', change);
    return () => m.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    const v = window.visualViewport;
    if (!v) return;
    const resize = () => {
      if (v.scale === 1) {
        document.documentElement.style.setProperty('--scene-height', `${v.height}px`);
        document.documentElement.style.setProperty('--scene-top', `${v.offsetTop}px`);
      }
    };
    resize();
    v.addEventListener('resize', resize);
    v.addEventListener('scroll', resize);
    return () => {
      v.removeEventListener('resize', resize);
      v.removeEventListener('scroll', resize);
      document.documentElement.style.removeProperty('--scene-height');
      document.documentElement.style.removeProperty('--scene-top');
    };
  }, []);
  useEffect(() => {
    try { localStorage.setItem(saveKey, JSON.stringify(chat.slice(-40))); }
    catch { /* private mode */ }
  }, [chat, saveKey]);
  useEffect(() => {
    if (phase === 'chat') end.current?.scrollIntoView({ block: 'nearest' });
  }, [chat.length, busy, phase]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat) return;
      if (phase === 'idle') {
        e.preventDefault();
        setPhase('playing');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);
  useEffect(() => {
    if (phase !== 'chat' || kickoffFor.current === play) return;
    kickoffFor.current = play;
    void speak(scene.kickoff, []);
  }, [phase, play, scene.kickoff]);

  function startFilm() {
    if (phase === 'idle') setPhase('playing');
  }
  function openChat() {
    setPhase(now => now === 'playing' ? 'chat' : now);
  }
  function resetTalk() {
    request.current?.abort();
    kickoffFor.current = -1;
    setIssue('');
    setDraft('');
    setBusy(false);
    setChat([]);
    setCanAdvance(false);
  }
  function replay() {
    resetTalk();
    setPlay(n => n + 1);
    setPhase('idle');
  }
  function goNext() {
    if (!scene.next || !canAdvance) return;
    const nextId = scene.next;
    resetTalk();
    setSceneId(nextId);
    setPlay(n => n + 1);
    setPhase('idle');
  }
  async function speak(message: string, history: ChatLine[], retry = false) {
    if (busy && !retry) return;
    setIssue('');
    setBusy(true);
    const control = new AbortController();
    request.current = control;
    const timeout = window.setTimeout(() => control.abort(), 28000);
    try {
      const reply = await askScene(sceneId, message, history, control.signal);
      if (request.current !== control) return;
      setChat(old => [...old, { role: 'assistant', content: reply.response }]);
      setCanAdvance(reply.next === 'advance' && Boolean(sceneOf(sceneId).next));
    } catch {
      if (request.current === control) setIssue('Модель сейчас не ответила. Можно повторить.');
    } finally {
      window.clearTimeout(timeout);
      if (request.current === control) {
        request.current = undefined;
        setBusy(false);
      }
    }
  }
  function retryLast() {
    if (busy) return;
    const index = chat.map(m => m.role).lastIndexOf('user');
    if (index >= 0) {
      void speak(chat[index].content, chat.slice(0, index), true);
      return;
    }
    void speak(scene.kickoff, [], true);
  }
  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (busy) return;
    const message = draft.trim();
    if (!message) return;
    const history = chat;
    setChat([...history, { role: 'user', content: message }]);
    setDraft('');
    await speak(message, history);
  }

  const chatting = phase === 'chat';
  const kicker = `Акт ${scene.act} · Сцена ${scene.number}`;

  return (
    <main className={`scene1-app ${reduced ? 'reduce-motion' : ''}`}>
      <div className={`scene1-stage ${chatting ? 'is-blurred' : ''}`}>
        <Suspense fallback={<div className="scene1-stage" />}>
          <CinematicStage
            key={`${sceneId}-${play}`}
            phase={phase}
            reducedMotion={reduced}
            film={scene.film}
            poster={scene.poster}
            shots={scene.shots}
            onEnded={openChat}
          />
        </Suspense>
      </div>
      {phase === 'idle' && (
        <button type="button" className="scene1-play" onClick={startFilm}>
          <p className="scene1-kicker">{kicker}</p>
          <h1 className="scene1-title">{scene.title}</h1>
          <p className="scene1-hint">Нажми, чтобы смотреть · Enter</p>
        </button>
      )}
      {phase === 'playing' && <p className="scene1-kicker scene1-kicker-live">{kicker}</p>}
      <section className={`scene1-chat ${chatting ? 'is-open' : ''}`} aria-hidden={!chatting} {...(!chatting ? { inert: '' } : {})}>
        <div className="scene1-chat-head">
          <p>После сцены</p>
          <button type="button" onClick={replay}>Смотреть ещё раз</button>
        </div>
        <div className="scene1-messages" role="log" aria-label="Разговор">
          {chat.map((m, i) => (
            <article key={i} className={`scene1-message ${m.role}`}>
              <span>{m.role === 'user' ? 'ТЫ' : ''}</span>
              <p>{m.content}</p>
            </article>
          ))}
          {busy && <p className="scene1-status" role="status">…</p>}
          <div ref={end} />
        </div>
        {issue && (
          <div className="scene1-status" role="status">
            <p>{issue}</p>
            <button type="button" onClick={retryLast} disabled={busy}>Повторить</button>
          </div>
        )}
        {canAdvance && scene.next && (
          <div className="scene1-status">
            <button type="button" className="scene1-next" onClick={goNext}>
              Дальше · {sceneOf(scene.next).title}
            </button>
          </div>
        )}
        <form className="scene1-compose" onSubmit={e => void send(e)}>
          <textarea
            aria-label="Твой ответ"
            placeholder="Что это напомнило?"
            rows={2}
            maxLength={2000}
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
          <button aria-label="Отправить" disabled={busy || !draft.trim()}>↑</button>
        </form>
      </section>
    </main>
  );
}
