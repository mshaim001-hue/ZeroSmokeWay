import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { FIRST_SCENE, neighbor, sceneOf, type SceneId, type Phase } from '../catalog';
import { askScene, type ChatLine } from './api';
import { saveProgress } from '../../auth/progress';
import { newMessageId, persistPhase, type MemoryEntry, type PlayerProgress } from '../../auth/progressModel';
import '../../auth/gate.css';
import './scene1.css';

const CinematicStage = lazy(() => import('./CinematicStage').then(m => ({ default: m.CinematicStage })));

type Props = {
  userId: string;
  initial: PlayerProgress;
  onSignOut: () => void;
};

function line(role: ChatLine['role'], content: string): ChatLine {
  return { id: newMessageId(), role, content };
}

export function Scene1App({ userId, initial, onSignOut }: Props) {
  const [sceneId, setSceneId] = useState<SceneId>(initial.sceneId || FIRST_SCENE);
  const scene = sceneOf(sceneId);
  const [play, setPlay] = useState(0);
  const [phase, setPhase] = useState<Phase>(initial.phase === 'chat' ? 'chat' : 'idle');
  const [chat, setChat] = useState<ChatLine[]>(initial.phase === 'chat' ? initial.chat : []);
  const [memory, setMemory] = useState<MemoryEntry[]>(initial.memory ?? []);
  const [canAdvance, setCanAdvance] = useState(initial.canAdvance === true);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState('');
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const request = useRef<AbortController>();
  const end = useRef<HTMLDivElement>(null);
  const kickoffFor = useRef(-1);
  const skipKickoff = useRef(initial.phase === 'chat' && initial.chat.length > 0);
  const snapshot = useRef({ sceneId, phase, chat, memory, canAdvance });
  snapshot.current = { sceneId, phase, chat, memory, canAdvance };

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
    const stored: PlayerProgress = {
      sceneId,
      phase: persistPhase(phase),
      chat: persistPhase(phase) === 'chat' ? chat.slice(-40) : [],
      seenIntro: true,
      canAdvance,
      memory: memory.slice(-40),
    };
    const timer = window.setTimeout(() => { void saveProgress(userId, stored); }, 400);
    return () => window.clearTimeout(timer);
  }, [userId, sceneId, phase, chat, memory, canAdvance]);
  useEffect(() => {
    const flush = () => {
      const now = snapshot.current;
      void saveProgress(userId, {
        sceneId: now.sceneId,
        phase: persistPhase(now.phase),
        chat: persistPhase(now.phase) === 'chat' ? now.chat.slice(-40) : [],
        seenIntro: true,
        canAdvance: now.canAdvance,
        memory: now.memory.slice(-40),
      });
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [userId]);
  useEffect(() => {
    if (phase === 'chat') end.current?.scrollIntoView({ block: 'nearest' });
  }, [chat.length, busy, phase]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat) return;
      if (phase === 'idle') {
        e.preventDefault();
        setPhase('playing');
        playFilmSound();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);
  useEffect(() => {
    if (phase !== 'chat' || kickoffFor.current === play) return;
    if (skipKickoff.current) {
      skipKickoff.current = false;
      kickoffFor.current = play;
      return;
    }
    kickoffFor.current = play;
    if (scene.openingLine) {
      setChat([line('assistant', scene.openingLine)]);
      return;
    }
    void speak(scene.kickoff, []);
  }, [phase, play, scene.kickoff, scene.openingLine]);

  function playFilmSound() {
    const node = document.querySelector('.scene1-film') as HTMLVideoElement | null;
    if (!node) return;
    node.muted = false;
    void node.play();
  }
  function startFilm() {
    if (phase !== 'idle') return;
    setPhase('playing');
    playFilmSound();
  }
  function openChat() {
    setPhase(now => now === 'playing' ? 'chat' : now);
  }
  function resetTalk() {
    request.current?.abort();
    kickoffFor.current = -1;
    skipKickoff.current = false;
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
  function goTo(id: SceneId | null) {
    if (!id) return;
    resetTalk();
    setSceneId(id);
    setPlay(n => n + 1);
    setPhase('idle');
  }
  function agreeNext() {
    if (!canAdvance) return;
    goTo(scene.next ?? neighbor(sceneId, 1));
  }
  async function speak(message: string, history: ChatLine[], retry = false) {
    if (busy && !retry) return;
    setIssue('');
    setBusy(true);
    const control = new AbortController();
    request.current = control;
    const timeout = window.setTimeout(() => control.abort(), 28000);
    try {
      const reply = await askScene(sceneId, message, history, control.signal, {
        memory: snapshot.current.memory,
        canAdvance: snapshot.current.canAdvance,
      });
      if (request.current !== control) return;
      setChat(old => [...old, line('assistant', reply.response)]);
      setMemory(Array.isArray(reply.memory) ? reply.memory : snapshot.current.memory);
      if (reply.next === 'offer' || reply.next === 'launch') setCanAdvance(true);
    } catch {
      if (request.current === control) setIssue('The model did not answer. You can retry.');
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
    if (scene.openingLine) {
      setIssue('');
      if (chat.length === 0) setChat([line('assistant', scene.openingLine)]);
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
    setChat([...history, line('user', message)]);
    setDraft('');
    await speak(message, history);
  }

  const chatting = phase === 'chat';
  const kicker = `Act ${scene.act} · Scene ${scene.number}`;
  const nextScene = scene.next ? sceneOf(scene.next) : null;

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
          <p className="scene1-hint">Tap to watch · Enter</p>
        </button>
      )}
      {!chatting && (
        <button type="button" className="gate-signout" onClick={onSignOut}>Sign out</button>
      )}
      {phase === 'playing' && <p className="scene1-kicker scene1-kicker-live">{kicker}</p>}
      <section className={`scene1-chat ${chatting ? 'is-open' : ''}`} aria-hidden={!chatting} {...(!chatting ? { inert: '' } : {})}>
        <div className="scene1-chat-head">
          <p>{scene.afterLabel ?? 'After the scene'}</p>
          <div className="gate-head-actions">
            <button type="button" onClick={replay}>Watch again</button>
            <button type="button" className="gate-signout is-inline" onClick={onSignOut}>Sign out</button>
          </div>
        </div>
        <div className="scene1-messages" role="log" aria-label="Conversation">
          {chat.map(m => (
            <article key={m.id} className={`scene1-message ${m.role}`}>
              <span>{m.role === 'user' ? 'YOU' : ''}</span>
              <p>{m.content}</p>
            </article>
          ))}
          {busy && <p className="scene1-status" role="status">…</p>}
          <div ref={end} />
        </div>
        {issue && (
          <div className="scene1-status" role="status">
            <p>{issue}</p>
            <button type="button" onClick={retryLast} disabled={busy}>Retry</button>
          </div>
        )}
        {chatting && canAdvance && nextScene && (
          <div className="scene1-status">
            <button type="button" className="scene1-next" onClick={agreeNext}>
              Next scene
            </button>
          </div>
        )}
        <form className="scene1-compose" onSubmit={e => void send(e)}>
          <textarea
            aria-label="Your reply"
            placeholder="What did that remind you of?"
            rows={2}
            maxLength={2000}
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
          <button aria-label="Send" disabled={busy || !draft.trim()}>↑</button>
        </form>
      </section>
    </main>
  );
}
