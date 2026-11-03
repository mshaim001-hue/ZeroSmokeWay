import { useEffect, useRef, useState, type FormEvent } from 'react';
import { applyLifecycle, currentOpenInterval, mergeSupportSnapshot, newMessageId, type PlayerProgress } from '../auth/progressModel';
import { LastCigaretteDialog } from './LastCigaretteDialog';
import { TodayScreen } from './TodayScreen';
import { ProgressScreen } from './ProgressScreen';
import { confirmLastCigarette, recordSmoked, saveQuitEstimates, saveSupportContent } from './quitApi';
import { askSupport } from './supportApi';
import { smokeFreeClock } from './timer';
import type { QuitEstimates } from './estimates';
import { MUSE_REQUEST_TIMEOUT_MS, type ChatLine } from '../scenes/act1/api';
import './support.css';

export type AccountInfo = {
  email?: string;
  name?: string;
};

type Props = {
  userId: string;
  initial: PlayerProgress;
  account?: AccountInfo;
  onSignOut: () => void;
  onProgress: (progress: PlayerProgress) => void;
};

type Tab = 'today' | 'progress' | 'support';

const KOFI = 'https://ko-fi.com/underdot';

function line(role: ChatLine['role'], content: string): ChatLine {
  return { id: newMessageId(), role, content };
}

export function SupportHome({ userId, initial, account, onSignOut, onProgress }: Props) {
  const [progress, setProgress] = useState(initial);
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState<Tab>('today');
  const [menu, setMenu] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState('');
  const [recordOpen, setRecordOpen] = useState(false);
  const [editingEstimates, setEditingEstimates] = useState(false);
  const request = useRef<AbortController>();
  const end = useRef<HTMLDivElement>(null);
  const chat = progress.supportChat;
  const openInterval = currentOpenInterval(progress);
  const accountName = account?.name?.trim() || '';
  const accountEmail = account?.email?.trim() || '';

  const tickFast = openInterval ? smokeFreeClock(openInterval.startedAt, now).showSeconds : false;
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), tickFast ? 1000 : 30000);
    return () => window.clearInterval(timer);
  }, [tickFast, openInterval?.id]);
  useEffect(() => {
    if (tab === 'support') end.current?.scrollIntoView({ block: 'nearest' });
  }, [chat.length, busy, tab]);
  useEffect(() => {
    const preserveChat = busy || Boolean(draft.trim()) || Boolean(request.current);
    setProgress(current => {
      const next = mergeSupportSnapshot(current, initial, { preserveChat });
      if (
        current.smokingStatus === next.smokingStatus
        && current.currentIntervalId === next.currentIntervalId
        && current.supportChat === next.supportChat
        && current.memory === next.memory
        && current.estimates === next.estimates
      ) return current;
      return next;
    });
  }, [initial, busy, draft]);
  useEffect(() => {
    if (userId === 'preview') return;
    const timer = window.setTimeout(() => {
      void saveSupportContent(userId, progress).catch(error => {
        setIssue(error instanceof Error ? error.message : 'Could not save this talk.');
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [userId, progress.supportChat, progress.memory]);

  function commit(next: PlayerProgress) {
    setProgress(next);
    onProgress(next);
  }

  /** Never call onProgress inside a setState updater — that updates AuthGate while SupportHome is rendering. */
  function commitFrom(updater: (current: PlayerProgress) => PlayerProgress) {
    let nextValue: PlayerProgress | undefined;
    setProgress(current => {
      nextValue = updater(current);
      return nextValue;
    });
    if (nextValue !== undefined) onProgress(nextValue);
  }

  async function speak(message: string, history: ChatLine[]) {
    setIssue('');
    setBusy(true);
    const control = new AbortController();
    request.current = control;
    const timeout = window.setTimeout(() => control.abort(), MUSE_REQUEST_TIMEOUT_MS);
    try {
      const reply = await askSupport(message, history, control.signal, {
        memory: progress.memory,
      });
      if (request.current !== control) return;
      commitFrom(current => ({
        ...current,
        memory: Array.isArray(reply.memory) ? reply.memory : current.memory,
        supportChat: [...history, line('user', message), line('assistant', reply.response)].slice(-40),
      }));
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
    setTab('support');
    setDraft('');
    const history = progress.supportChat;
    commitFrom(current => ({
      ...current,
      supportChat: [...current.supportChat, line('user', message)].slice(-40),
    }));
    await speak(message, history);
  }

  function retryLast() {
    if (busy) return;
    const index = chat.map(item => item.role).lastIndexOf('user');
    if (index < 0) return;
    void speak(chat[index].content, chat.slice(0, index));
  }

  async function onRecord(when: Date, restart: boolean) {
    setBusy(true);
    setIssue('');
    try {
      const snapshot = await recordSmoked(userId, when, restart);
      commitFrom(current => applyLifecycle(current, snapshot));
      setRecordOpen(false);
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
      const snapshot = await confirmLastCigarette(userId, new Date(), 'now');
      commitFrom(current => applyLifecycle(current, snapshot));
      setRecordOpen(false);
    } catch (error) {
      setIssue(error instanceof Error ? error.message : 'Could not start a new count.');
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEstimates(estimates: QuitEstimates) {
    setBusy(true);
    setIssue('');
    try {
      const next = { ...progress, estimates };
      await saveQuitEstimates(userId, next, estimates);
      commit(next);
      setEditingEstimates(false);
    } catch (error) {
      setIssue(error instanceof Error ? error.message : 'Could not save those estimates.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="support-app has-dock">
      <div className="support-body">
        <header className="support-head">
          <p className="support-brand">ZeroSmokeWay</p>
          <button type="button" className="support-menu-btn" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(open => !open)}>☰</button>
        </header>
        {menu ? (
          <>
            <button type="button" className="support-menu-backdrop" aria-label="Close menu" onClick={() => setMenu(false)} />
            <nav className="support-menu" aria-label="More">
              {(accountName || accountEmail) ? (
                <div className="support-account" aria-label="Signed-in account">
                  {accountName ? <strong>{accountName}</strong> : null}
                  {accountEmail ? <span>{accountEmail}</span> : null}
                </div>
              ) : null}
              <a href="/about.html" onClick={() => setMenu(false)}>About</a>
              <a href="/feedback.html" onClick={() => setMenu(false)}>Leave feedback</a>
              <a href={KOFI} target="_blank" rel="noopener noreferrer" onClick={() => setMenu(false)}>Support the project ↗</a>
              <button type="button" onClick={() => { setMenu(false); onSignOut(); }}>Sign out</button>
            </nav>
          </>
        ) : null}

        {tab === 'today' ? (
          <TodayScreen
            progress={progress}
            now={now}
            busy={busy}
            editingEstimates={editingEstimates}
            onTalk={() => setTab('support')}
            onStartCount={() => setRecordOpen(true)}
            onSaveEstimates={estimates => void onSaveEstimates(estimates)}
            onEditEstimates={() => setEditingEstimates(on => !on)}
          />
        ) : null}
        {tab === 'progress' ? (
          <ProgressScreen
            progress={progress}
            now={now}
            busy={busy}
            editingEstimates={editingEstimates}
            onSaveEstimates={estimates => void onSaveEstimates(estimates)}
            onEditEstimates={() => setEditingEstimates(on => !on)}
            onCorrectStatus={() => setRecordOpen(true)}
          />
        ) : null}
        {tab === 'support' ? (
          <section className="support-chat" aria-label="Support conversation">
            <div className="support-messages" role="log" aria-label="Support conversation">
              {chat.map(item => (
                <article key={item.id} className={`support-bubble ${item.role}`}>
                  <span>{item.role === 'user' ? 'You' : ''}</span>
                  <p>{item.content}</p>
                </article>
              ))}
              {busy && <p className="support-status" role="status">Writing a reply…</p>}
              <div ref={end} />
            </div>
            {issue && tab === 'support' ? (
              <div className="support-status" role="status">
                <p>{issue}</p>
                <button type="button" onClick={retryLast} disabled={busy}>Retry</button>
              </div>
            ) : null}
            <form className="support-compose" onSubmit={(event: FormEvent) => { event.preventDefault(); void send(draft); }}>
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
        ) : null}

        {issue && tab !== 'support' ? (
          <p className="support-status" role="status">{issue}</p>
        ) : null}

        <nav className="support-dock" aria-label="Support">
          <button type="button" className={tab === 'today' ? 'is-on' : ''} onClick={() => setTab('today')}>Today</button>
          <button type="button" className={tab === 'progress' ? 'is-on' : ''} onClick={() => setTab('progress')}>Progress</button>
          <button type="button" className={tab === 'support' ? 'is-on' : ''} onClick={() => setTab('support')}>Support</button>
        </nav>
      </div>

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
