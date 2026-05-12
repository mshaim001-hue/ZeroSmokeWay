import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ChatMessage, postOrchestrator } from './api';
import { ProgressQuitScreen } from './ProgressQuitScreen';
import { HealthMilestonesScreen } from './HealthMilestonesScreen';
import { SettingsQuitScreen } from './SettingsQuitScreen';
import { SupportProjectScreen } from './SupportProjectScreen';

const PHASE_WELCOME = 'welcome';

const PHASE_LABELS: Record<string, string> = {
  welcome: 'Знакомство',
  anamnesis: 'Анамнез',
  myth_busting: 'Разбор мифов',
  support: 'Поддержка',
};

/** Индекс активного «агента» в шкале 0…2 (оркестратор → anamnesis | myth_buster | support). */
function agentProgressIndex(phase: string): number {
  if (phase === 'support') return 2;
  if (phase === 'myth_busting') return 1;
  return 0;
}

const AGENT_STEPS = [
  { id: 'anamnesis', short: 'Анамнез', hint: 'Собираем контекст мягко, по одному вопросу' },
  { id: 'myth_buster', short: 'Мифы', hint: 'Вопросы и мысли из твоего опыта' },
  { id: 'support', short: 'Поддержка', hint: 'После инсайта — закрепление и опора' },
] as const;

type SidebarTab = 'progress' | 'health' | 'settings' | 'support_project';

function nowIso() {
  return new Date().toISOString();
}

function phaseLabel(phase: string): string {
  return PHASE_LABELS[phase] ?? phase;
}

function firstPlanFocus(plan: Record<string, unknown> | null): string | null {
  const steps = plan?.steps;
  if (!Array.isArray(steps) || steps.length === 0) return null;
  const s0 = steps[0];
  if (s0 && typeof s0 === 'object' && s0 !== null && 'focus' in s0) {
    const f = (s0 as { focus: unknown }).focus;
    if (typeof f === 'string' && f.trim()) return f.trim();
  }
  return null;
}

function formatMsgTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function BotAvatar() {
  return (
    <div className="msg-avatar" aria-hidden>
      <span className="msg-avatar-letter">А</span>
    </div>
  );
}

function LogoMark() {
  return (
    <svg className="header-logo-icon" width="40" height="40" viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1b5e20" />
          <stop offset="100%" stopColor="#43a047" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#logoGrad)" />
      <path
        d="M12 22c2.5-6 8-9 12-9 3 0 5 1 6 2-2-5-6-8-11-8-7 0-12 6-12 13 0 3 1 6 3 8l2-6z"
        fill="#fff"
        opacity="0.95"
      />
      <path d="M18 26c4-1 8-4 10-8" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function AgentProgressBar({ phase }: { phase: string }) {
  const active = agentProgressIndex(phase);
  return (
    <div className="agent-progress" role="group" aria-label="Прогресс по этапам консультантов">
      <div className="agent-progress-track">
        {AGENT_STEPS.map((step, i) => (
          <div
            key={step.id}
            className={
              'agent-progress-seg' +
              (i < active ? ' agent-progress-seg--done' : '') +
              (i === active ? ' agent-progress-seg--active' : '') +
              (i > active ? ' agent-progress-seg--todo' : '')
            }
          />
        ))}
      </div>
      <div className="agent-progress-labels">
        {AGENT_STEPS.map((s, i) => (
          <div
            key={s.id}
            className={
              'agent-progress-label' +
              (i === active ? ' agent-progress-label--active' : '') +
              (i < active ? ' agent-progress-label--done' : '')
            }
          >
            <span className="agent-progress-name">{s.short}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SIDEBAR_TABS: { id: SidebarTab; label: string }[] = [
  { id: 'progress', label: 'Прогресс' },
  { id: 'health', label: 'Здоровье' },
  { id: 'settings', label: 'Настройки' },
  { id: 'support_project', label: 'Поддержка проекта' },
];

export function ChatApp() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState(PHASE_WELCOME);
  const [plan, setPlan] = useState<Record<string, unknown> | null>(null);
  const [anamnesis, setAnamnesis] = useState<Record<string, unknown> | null>(null);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('progress');
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollDown = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    scrollDown();
  }, [messages, loading]);

  const startJourney = useCallback(() => {
    setMessages([
      {
        text: 'Привет 🙂\n\nЯ здесь, чтобы помочь тебе разобраться с курением.\n\nБез моралей, без давления, без «надо». Просто честный разговор.',
        isUser: false,
        timestamp: nowIso(),
      },
      {
        text: 'Для начала — как я могу к тебе обращаться?',
        isUser: false,
        timestamp: nowIso(),
      },
    ]);
    setPhase(PHASE_WELCOME);
    setPlan(null);
    setAnamnesis(null);
    setError(null);
  }, []);

  useEffect(() => {
    startJourney();
  }, [startJourney]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { text, isUser: true, timestamp: nowIso() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const data = await postOrchestrator(
        {
          message: text,
          conversationHistory: history,
          anamnesisData: anamnesis,
          phase,
          userProfile: null,
          currentPlan: plan,
        },
        null,
      );

      const bot: ChatMessage = {
        text: data.response,
        isUser: false,
        timestamp: nowIso(),
      };
      setMessages((m) => [...m, bot]);
      if (data.phase) setPhase(data.phase);
      if (data.plan) setPlan(data.plan);
      if (data.extractedData && Object.keys(data.extractedData).length) {
        setAnamnesis((prev) => ({ ...(prev ?? {}), ...data.extractedData }));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const nextFocus = firstPlanFocus(plan);

  return (
    <div className="chat-app">
      <header className="chat-header">
        <div className="chat-header-left">
          <div className="chat-header-logo-row">
            <LogoMark />
            <div className="chat-header-brand">
              <span className="chat-header-title">ZeroSmokeWay</span>
              <span className="chat-header-tagline">Честный разговор о курении</span>
            </div>
          </div>
        </div>

        <div className="chat-header-center">
          <AgentProgressBar phase={phase} />
        </div>

        <div className="chat-header-actions">
          <button type="button" className="btn-ghost" onClick={startJourney}>
            Сначала
          </button>
        </div>
      </header>

      <div className="chat-body">
        <div className="chat-main">
          <main className="chat-thread" aria-busy={loading}>
            {messages.map((m, i) => {
              const showBotName = !m.isUser && (i === 0 || messages[i - 1]?.isUser);
              const timeStr = formatMsgTime(m.timestamp);

              if (m.isUser) {
                return (
                  <div key={i} className="msg-row msg-row--user">
                    <div className="msg-column msg-column--user">
                      <div className="msg-bubble msg-bubble--user">
                        <p className="msg-text">{m.text}</p>
                        {timeStr ? (
                          <div className="msg-meta">
                            <span className="msg-time">{timeStr}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={i} className="msg-row msg-row--bot">
                  <BotAvatar />
                  <div className="msg-column msg-column--bot">
                    {showBotName ? <span className="msg-sender">Алекс</span> : null}
                    <div className="msg-bubble msg-bubble--bot">
                      <p className="msg-text">{m.text}</p>
                      {timeStr ? (
                        <div className="msg-meta">
                          <span className="msg-time">{timeStr}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="typing-row">
                <BotAvatar />
                <div className="typing-block">
                  <span className="msg-sender msg-sender--typing">Алекс</span>
                  <div
                    className="typing-bubble"
                    role="status"
                    aria-live="polite"
                    aria-label="Алекс формирует ответ"
                  >
                    <span className="typing-label">печатает</span>
                    <span className="typing-dots" aria-hidden>
                      <span />
                      <span />
                      <span />
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </main>

          {error && <div className="chat-error">{error}</div>}

          <div className="chat-composer-wrap">
            <form className="chat-form" onSubmit={onSend}>
              <div className="chat-form-input-wrap">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={loading ? 'Ждём ответ…' : 'Сообщение'}
                  disabled={loading}
                  aria-label="Сообщение"
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                className="btn-send"
                disabled={loading}
                title={loading ? 'Отправка…' : 'Отправить'}
                aria-label={loading ? 'Отправка…' : 'Отправить'}
              >
                {loading ? (
                  <span className="btn-send-spinner" aria-hidden />
                ) : (
                  <svg className="btn-send-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                    <path
                      fill="currentColor"
                      d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"
                    />
                  </svg>
                )}
              </button>
            </form>
          </div>
        </div>

        <aside className="chat-sidebar" aria-label="Панель разделов">
          <nav className="sidebar-tab-grid" aria-label="Разделы боковой панели">
            {SIDEBAR_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={'sidebar-tab' + (sidebarTab === t.id ? ' sidebar-tab--active' : '')}
                onClick={() => setSidebarTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="sidebar-panel-scroll">
            {sidebarTab === 'progress' && (
              <div className="sidebar-panel sidebar-panel--flush">
                <ProgressQuitScreen
                  chatPhaseLabel={phaseLabel(phase)}
                  agentShort={AGENT_STEPS[agentProgressIndex(phase)].short}
                  agentHint={AGENT_STEPS[agentProgressIndex(phase)].hint}
                  nextFocus={nextFocus}
                />
              </div>
            )}

            {sidebarTab === 'health' && (
              <div className="sidebar-panel sidebar-panel--health-flush">
                <HealthMilestonesScreen onBack={() => setSidebarTab('progress')} />
              </div>
            )}

            {sidebarTab === 'settings' && (
              <div className="sidebar-panel sidebar-panel--settings-flush">
                <SettingsQuitScreen onBack={() => setSidebarTab('progress')} />
              </div>
            )}

            {sidebarTab === 'support_project' && (
              <div className="sidebar-panel sidebar-panel--support-flush">
                <SupportProjectScreen onBack={() => setSidebarTab('progress')} />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
