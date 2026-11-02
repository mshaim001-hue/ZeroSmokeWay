import { useEffect, useRef, useState, type FormEvent } from 'react';
import { currentOpenInterval, newMessageId, type PlayerProgress } from '../auth/progressModel';
import { saveProgress } from '../auth/progress';
import { LastCigaretteDialog } from './LastCigaretteDialog';
import { visibleBodyCards, usesNrtFromMemory } from './bodyCards';
import { confirmLastCigarette, recordSmoked, saveSupportChat } from './quitApi';
import { askSupport } from './supportApi';
import { formatSmokeFree } from './timer';
import type { ChatLine } from '../scenes/act1/api';
import '../auth/gate.css';
import '../scenes/act1/scene1.css';
import './support.css';

type Props = {
  userId: string;
  initial: PlayerProgress;
  onSignOut: () => void;
  onProgress: (progress: PlayerProgress) => void;
};

const CHIPS = [
  { id: 'want', label: 'I want a cigarette' },
  { id: 'think', label: 'I’m thinking about cigarettes' },
  { id: 'hard', label: 'I’m having a hard time' },
  { id: 'smoked', label: 'I smoked' },
];

function line(role: ChatLine['role'], content: string): ChatLine {
  return { id: newMessageId(), role, content };
}

export function SupportHome({ userId, initial, onSignOut, onProgress }: Props) {
  const [progress, setProgress] = useState(initial);
  const [now, setNow] = useState(Date.now());
  const [open, setOpen] = useState(initial.supportChat.length > 0);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState('');
  const [recordOpen, setRecordOpen] = useState(false);
  const [offerRecord, setOfferRecord] = useState(false);
  const request = useRef<AbortController>();
  const end = useRef<HTMLDivElement>(null);
  const chat = progress.supportChat;
  const openInterval = currentOpenInterval(progress);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (open) end.current?.scrollIntoView({ block: 'nearest' });
  }, [chat.length, busy, open]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void saveProgress(userId, progress);
      if (progress.appStage === 'support') {
        void saveSupportChat(userId, progress.supportChat).catch(() => undefined);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [userId, progress]);

  function replace(next: PlayerProgress) {
    setProgress(next);
    onProgress(next);
  }

  async function speak(message: string, history: ChatLine[]) {
    setIssue('');
    setBusy(true);
    const control = new AbortController();
    request.current = control;
    const timeout = window.setTimeout(() => control.abort(), 28000);
    try {
      const reply = await askSupport(message, history, control.signal, {
        memory: progress.memory,
        smokingStatus: progress.smokingStatus,
      });
      if (request.current !== control) return;
      setOfferRecord(reply.recordSmoked === true);
      replace({
        ...progress,
        memory: Array.isArray(reply.memory) ? reply.memory : progress.memory,
        supportChat: [...history, line('user', message), line('assistant', reply.response)].slice(-40),
      });
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

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setOpen(true);
    setDraft('');
    const history = progress.supportChat;
    replace({ ...progress, supportChat: [...history, line('user', message)] });
    await speak(message, history);
  }

  function retryLast() {
    const index = chat.map(item => item.role).lastIndexOf('user');
    if (index < 0) return;
    void speak(chat[index].content, chat.slice(0, index));
  }

  async function onRecord(when: Date, restart: boolean) {
    setBusy(true);
    setIssue('');
    try {
      replace(await recordSmoked(userId, when, restart));
      setRecordOpen(false);
      setOfferRecord(false);
    } catch (error) {
      setIssue(error instanceof Error ? error.message : 'Could not record that cigarette.');
    } finally {
      setBusy(false);
    }
  }

  async function onRestartNow() {
    setBusy(true);
    setIssue('');
    try {
      replace(await confirmLastCigarette(userId, new Date(), 'now'));
      setRecordOpen(false);
    } catch (error) {
      setIssue(error instanceof Error ? error.message : 'Could not start a new count.');
    } finally {
      setBusy(false);
    }
  }

  const nrt = usesNrtFromMemory(progress.memory);
  const cards = openInterval ? visibleBodyCards(openInterval.startedAt, nrt, now) : [];

  return (
    <main className="scene1-app support-home">
      <div className="support-sheet">
        <div className="scene1-chat-head">
          <p>Support</p>
          <button type="button" className="gate-signout is-inline" onClick={onSignOut}>Sign out</button>
        </div>
        {openInterval ? (
          <section className="support-timer" aria-live="polite">
            <p className="gate-kicker">Smoke-free</p>
            <p className="support-count">{formatSmokeFree(openInterval.startedAt, now)}</p>
          </section>
        ) : (
          <section className="support-timer">
            <p className="gate-kicker">Right now</p>
            <p className="support-count">Smoking / getting ready again</p>
            <p className="support-note">Past stretches stay in history. The live count is off until you name a last cigarette.</p>
            <button type="button" className="scene1-next" onClick={() => setRecordOpen(true)}>Start a new count</button>
          </section>
        )}
        {progress.intervals.some(item => item.endedAt) ? (
          <ol className="support-history">
            {progress.intervals.filter(item => item.endedAt).map(item => (
              <li key={item.id}>Earlier stretch from {new Date(item.startedAt).toLocaleString()}</li>
            ))}
          </ol>
        ) : null}
        <section className="support-cards">
          <h2>What’s changing in the body</h2>
          <p className="support-note">General notes from public health pages, not measurements of you, and not a symptom timetable.</p>
          {openInterval ? cards.map(card => (
            <article key={card.id}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              <a href={card.source.url} target="_blank" rel="noopener noreferrer">{card.source.name}</a>
            </article>
          )) : <p className="support-note">Cards follow a live smoke-free count.</p>}
        </section>
        <div className="support-actions">
          <button type="button" className="scene1-next" onClick={() => setOpen(true)}>Support</button>
          <a className="scene1-offer-stay" href="/feedback.html">Leave feedback</a>
          <a className="scene1-offer-stay" href="/about.html">About</a>
        </div>
      </div>
      <section className={`scene1-chat ${open ? 'is-open' : ''}`} aria-hidden={!open} {...(!open ? { inert: '' } : {})}>
        <div className="scene1-chat-head">
          <p>Support</p>
          <button type="button" onClick={() => setOpen(false)}>Close</button>
        </div>
        <div className="support-chips">
          {CHIPS.map(chip => (
            <button key={chip.id} type="button" disabled={busy} onClick={() => void send(chip.label)}>{chip.label}</button>
          ))}
        </div>
        <div className="scene1-messages" role="log" aria-label="Support conversation">
          {chat.map(item => (
            <article key={item.id} className={`scene1-message ${item.role}`}>
              <span>{item.role === 'user' ? 'YOU' : ''}</span>
              <p>{item.content}</p>
            </article>
          ))}
          {busy && <p className="scene1-status" role="status">…</p>}
          <div ref={end} />
        </div>
        {offerRecord && progress.smokingStatus !== 'smoking' ? (
          <button type="button" className="scene1-next support-record" onClick={() => setRecordOpen(true)}>
            Record that I smoked
          </button>
        ) : null}
        {issue && (
          <div className="scene1-status" role="status">
            <p>{issue}</p>
            <button type="button" onClick={retryLast} disabled={busy}>Retry</button>
          </div>
        )}
        <form className="scene1-compose" onSubmit={(event: FormEvent) => { event.preventDefault(); void send(draft); }}>
          <textarea
            aria-label="Your reply"
            placeholder="What’s going on right now?"
            rows={2}
            maxLength={2000}
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
          <button aria-label="Send" disabled={busy || !draft.trim()}>↑</button>
        </form>
      </section>
      {recordOpen && (
        <div className="support-modal">
          {openInterval ? (
            <LastCigaretteDialog
              title="When was this cigarette?"
              copy="This stops the live count. Past stretches stay in history. You can start a new count from this cigarette, or leave the timer off."
              nowLabel="I smoked, stop the live count"
              enterLabel="Start a new count from this time"
              notYetLabel="Cancel"
              busy={busy}
              issue={issue}
              onNow={() => void onRecord(new Date(), false)}
              onEnter={when => void onRecord(when, true)}
              onNotYet={() => setRecordOpen(false)}
            />
          ) : (
            <LastCigaretteDialog
              title="Start a new count from a last cigarette?"
              copy="The live timer stays off until you name a last cigarette that is already behind you."
              nowLabel="Yes, start the count now"
              enterLabel="Use this time"
              notYetLabel="Not yet"
              busy={busy}
              issue={issue}
              onNow={() => void onRestartNow()}
              onEnter={when => void onRecord(when, true)}
              onNotYet={() => setRecordOpen(false)}
            />
          )}
        </div>
      )}
    </main>
  );
}
