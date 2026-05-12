import type { Session } from '@supabase/supabase-js';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  ChatMessage,
  fetchOrchestratorSession,
  postOrchestrator,
  putOrchestratorGuestSnapshot,
} from './api';
import { AuthModal } from './AuthModal';
import { parseStoredOrchestratorSession } from './orchestratorSessionRestore';
import { getSupabase } from './supabaseClient';
import { ProgressQuitScreen } from './ProgressQuitScreen';
import { HealthMilestonesScreen } from './HealthMilestonesScreen';
import { SettingsQuitScreen } from './SettingsQuitScreen';
import { SupportProjectScreen } from './SupportProjectScreen';

const PHASE_WELCOME = 'welcome';

/** Гостевая сессия: напоминания о входе (от момента готовности чата без JWT). */
const GUEST_AUTH_REMINDER_MS = {
  /** Первое уведомление */
  first: 5 * 60 * 1000,
  /** Второе: через 3 мин после первого (5 + 3 от старта) */
  second: 8 * 60 * 1000,
  /** Финальное: ещё +1 мин (9 мин от старта), без кнопки закрытия */
  third: 9 * 60 * 1000,
} as const;

type SidebarTab =
  | 'progress'
  | 'health'
  | 'settings'
  | 'support_project'
  | 'sponsor_1'
  | 'sponsor_2'
  | 'sponsor_3';

function nowIso() {
  return new Date().toISOString();
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
    <svg className="header-logo-icon" width="44" height="44" viewBox="0 0 40 40" aria-hidden>
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

const RAIL_ITEMS: { id: SidebarTab; icon: string; label: string }[] = [
  { id: 'progress', icon: '📈', label: 'Прогресс' },
  { id: 'health', icon: '❤️', label: 'Здоровье' },
  { id: 'settings', icon: '⚙️', label: 'Настройки' },
  { id: 'support_project', icon: '🙏', label: 'Проект' },
];

const SPONSOR_SLOT_IDS = ['sponsor_1', 'sponsor_2', 'sponsor_3'] as const satisfies readonly SidebarTab[];

/** Заголовок в общей зелёной шапке оверлея (как во встроенных экранах без дубля) */
const TOOL_OVERLAY_TITLE: Record<SidebarTab, string> = {
  progress: 'Прогресс',
  health: 'Здоровье',
  settings: 'Настройки',
  support_project: 'Поддержка проекта',
  sponsor_1: 'Наши спонсоры',
  sponsor_2: 'Наши спонсоры',
  sponsor_3: 'Наши спонсоры',
};

export function ChatApp() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState(PHASE_WELCOME);
  const [plan, setPlan] = useState<Record<string, unknown> | null>(null);
  const [anamnesis, setAnamnesis] = useState<Record<string, unknown> | null>(null);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('progress');
  const [toolPanelOpen, setToolPanelOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [guestAuthReminder, setGuestAuthReminder] = useState<0 | 1 | 2 | 3>(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const guestReminderGuestRef = useRef(false);

  /** Снимок чата перед SIGNED_IN: перенос гостевой переписки в пустой аккаунт. */
  const orchestratorHydrateSnapRef = useRef({
    messages,
    phase,
    plan,
    anamnesis,
  });

  orchestratorHydrateSnapRef.current = { messages, phase, plan, anamnesis };

  const accessToken = session?.access_token ?? null;

  guestReminderGuestRef.current = bootstrapping ? false : !accessToken;

  const guestComposerLocked = !bootstrapping && !accessToken && guestAuthReminder === 3;

  const hydrateOrchestratorAfterSignIn = useCallback(
    async (token: string) => {
      const snap = orchestratorHydrateSnapRef.current;

      let stored = null as Awaited<ReturnType<typeof fetchOrchestratorSession>>;
      try {
        stored = await fetchOrchestratorSession(token);
      } catch {
        stored = null;
      }

      const parsed = parseStoredOrchestratorSession(
        stored ?? { messages: [], orchestrator_state: {} },
      );
      const serverHasHistory = !!(parsed.messages && parsed.messages.length > 0);

      if (!serverHasHistory && snap.messages.length > 0) {
        try {
          const outcome = await putOrchestratorGuestSnapshot(token, {
            messages: snap.messages,
            phase: snap.phase,
            plan: snap.plan,
            anamnesis: snap.anamnesis,
          });
          if (outcome === 'exists') {
            await restoreChatFromServer(token);
            return;
          }
          setError(null);
        } catch (err: unknown) {
          setError(
            err instanceof Error
              ? err.message
              : 'Не удалось сохранить переписку сразу; она сохранится при следующем отправленном сообщении.',
          );
        }
        setMessages(snap.messages);
        if (snap.phase) setPhase(snap.phase);
        setPlan(snap.plan);
        setAnamnesis(snap.anamnesis ?? null);
        return;
      }

      await restoreChatFromServer(token);
    },
    [restoreChatFromServer],
  );

  const scrollDown = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    scrollDown();
  }, [messages, loading]);

  const startJourney = useCallback(() => {
    setMessages([
      {
        text:
          'Привет, я Алекс. Можно просто поговорить — про сигареты, никотин и всё что с этим связано.\n\nКак вас зовут?',
        isUser: false,
        timestamp: nowIso(),
      },
    ]);
    setPhase(PHASE_WELCOME);
    setPlan(null);
    setAnamnesis(null);
    setError(null);
    setToolPanelOpen(false);
  }, []);

  const restoreChatFromServer = useCallback(
    async (token: string) => {
      try {
        const stored = await fetchOrchestratorSession(token);
        if (!stored) {
          startJourney();
          return;
        }
        const parsed = parseStoredOrchestratorSession(stored);
        if (!parsed.messages?.length) {
          startJourney();
          return;
        }
        setMessages(parsed.messages);
        if (parsed.phase) setPhase(parsed.phase);
        if (parsed.plan) setPlan(parsed.plan);
        setAnamnesis(parsed.anamnesis);
        setError(null);
      } catch {
        startJourney();
      }
    },
    [startJourney],
  );

  /** Первая загрузка: либо диалог из Supabase (GET), либо гостевой приветствие. */
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      startJourney();
      setBootstrapping(false);
      return;
    }

    let cancelled = false;

    sb.auth.getSession().then(async ({ data: { session: initial } }) => {
      if (cancelled) return;
      setSession(initial);
      if (initial?.access_token) {
        await restoreChatFromServer(initial.access_token);
      } else {
        startJourney();
      }
      if (!cancelled) setBootstrapping(false);
    });

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(async (event, nextSession) => {
      setSession(nextSession);
      if (cancelled) return;
      if (event === 'SIGNED_IN' && nextSession?.access_token) {
        await hydrateOrchestratorAfterSignIn(nextSession.access_token);
      }
      if (event === 'SIGNED_OUT') {
        startJourney();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [hydrateOrchestratorAfterSignIn, restoreChatFromServer, startJourney]);

  /** Для незалогиненных: три отложенных напоминания о входе (5 мин → +3 мин → +1 мин). */
  useEffect(() => {
    if (bootstrapping || accessToken) {
      setGuestAuthReminder(0);
      return;
    }

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const show = (stage: 1 | 2 | 3) => {
      if (!guestReminderGuestRef.current) return;
      setGuestAuthReminder(stage);
    };

    timeouts.push(
      window.setTimeout(() => show(1), GUEST_AUTH_REMINDER_MS.first),
      window.setTimeout(() => show(2), GUEST_AUTH_REMINDER_MS.second),
      window.setTimeout(() => show(3), GUEST_AUTH_REMINDER_MS.third),
    );

    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [accessToken, bootstrapping]);

  /** Подгонка под visual viewport при открытой клавиатуре — шапка остаётся сверху видимой области. */
  useEffect(() => {
    const docEl = document.documentElement;

    const layoutHeightFallback = (): number => {
      const ih = typeof window.innerHeight === 'number' ? window.innerHeight : 0;
      const dc = typeof docEl.clientHeight === 'number' ? docEl.clientHeight : 0;
      return Math.max(ih > 48 ? ih : 0, dc > 48 ? dc : 0, 568);
    };

    const sync = () => {
      try {
        const inner = layoutHeightFallback();
        const vv = window.visualViewport;
        if (vv) {
          let h =
            typeof vv.height === 'number' && Number.isFinite(vv.height) ? vv.height : inner;
          if (h <= 48) {
            h = inner;
          }
          const top =
            typeof vv.offsetTop === 'number' && Number.isFinite(vv.offsetTop) ? vv.offsetTop : 0;
          docEl.style.setProperty('--zsw-chat-vh', `${Math.round(Math.max(h, 1))}px`);
          docEl.style.setProperty('--zsw-chat-offset-top', `${Math.round(Math.max(0, top))}px`);
        } else {
          docEl.style.setProperty('--zsw-chat-vh', `${Math.round(inner)}px`);
          docEl.style.removeProperty('--zsw-chat-offset-top');
        }
      } catch {
        docEl.style.removeProperty('--zsw-chat-vh');
        docEl.style.removeProperty('--zsw-chat-offset-top');
      }
    };

    sync();
    const rafId = window.requestAnimationFrame(() => sync());
    let vvCleanup: Window['visualViewport'] | null = null;
    const vv = window.visualViewport;
    vvCleanup = vv;
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    window.addEventListener('load', sync);
    window.addEventListener('pageshow', sync);

    return () => {
      window.cancelAnimationFrame(rafId);
      vvCleanup?.removeEventListener('resize', sync);
      vvCleanup?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      window.removeEventListener('load', sync);
      window.removeEventListener('pageshow', sync);
      docEl.style.removeProperty('--zsw-chat-vh');
      docEl.style.removeProperty('--zsw-chat-offset-top');
    };
  }, []);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (bootstrapping || guestComposerLocked) return;
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
        accessToken,
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

  const overlayToolTitle = TOOL_OVERLAY_TITLE[sidebarTab];

  function toggleRailTab(id: SidebarTab) {
    if (sidebarTab === id && toolPanelOpen) {
      setToolPanelOpen(false);
    } else {
      setSidebarTab(id);
      setToolPanelOpen(true);
    }
  }

  const sponsorStubSlot: 1 | 2 | 3 | null =
    sidebarTab === 'sponsor_1' ? 1 : sidebarTab === 'sponsor_2' ? 2 : sidebarTab === 'sponsor_3' ? 3 : null;

  return (
    <div className="chat-app">
      <header className="chat-header">
        <div className="chat-header-top">
          <div className="chat-header-brand-row">
            <LogoMark />
            <div className="chat-header-brand">
              <span className="chat-header-title">ZeroSmokeWay</span>
              <span className="chat-header-tagline">Честный разговор о курении</span>
            </div>
          </div>
          <div className="chat-header-actions chat-header-auth">
            {accessToken ? (
              <button
                type="button"
                className="chat-header-user"
                title={session?.user?.email ?? 'Аккаунт'}
                onClick={() => setAuthModalOpen(true)}
              >
                {session?.user?.email?.split('@')[0] ?? 'Аккаунт'}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--secondary btn--pill"
                onClick={() => setAuthModalOpen(true)}
              >
                Войти
              </button>
            )}
            <button type="button" className="btn btn--secondary btn--pill" onClick={startJourney}>
              Сначала
            </button>
          </div>
        </div>
      </header>

      {!bootstrapping && !accessToken && guestAuthReminder > 0 ? (
        <aside
          className={
            'guest-auth-reminder' +
            (guestAuthReminder === 3 ? ' guest-auth-reminder--final' : '')
          }
          role={guestAuthReminder === 3 ? 'alert' : 'status'}
          aria-live="polite"
        >
          <div className="guest-auth-reminder__inner">
            <p className="guest-auth-reminder__text">
              {guestAuthReminder === 1
                ? 'Вы в чате уже какое-то время. Чтобы сохранять историю и прогресс между заходами, войдите или зарегистрируйтесь.'
                : guestAuthReminder === 2
                  ? 'Напоминание: без аккаунта переписка хранится только в этом браузере. Регистрация займёт пару минут.'
                  : 'Отправка сообщений временно недоступна без входа. Войдите или зарегистрируйтесь — ваша текущая переписка перенесётся в аккаунт.'}
            </p>
            <div className="guest-auth-reminder__actions">
              {(guestAuthReminder === 1 || guestAuthReminder === 2) && (
                <button
                  type="button"
                  className="btn btn--secondary btn--compact"
                  onClick={() => setGuestAuthReminder(0)}
                >
                  Позже
                </button>
              )}
              <button
                type="button"
                className="btn btn--primary btn--compact"
                onClick={() => setAuthModalOpen(true)}
              >
                Войти
              </button>
            </div>
          </div>
        </aside>
      ) : null}

      <div className="chat-body">
        <div className="chat-main">
          <div className="chat-main-inner">
            <div className="chat-content">
              {!toolPanelOpen && (
                <main className="chat-thread" aria-busy={loading || bootstrapping}>
                  {bootstrapping ? (
                    <div className="chat-bootstrap-hint">Загрузка…</div>
                  ) : null}
                  {!bootstrapping &&
                    messages.map((m, i) => {
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
                  {!bootstrapping && loading && (
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
              )}

              {toolPanelOpen && (
                <div
                  className="chat-tool-overlay"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="chat-tool-overlay-heading"
                  aria-label={overlayToolTitle}
                >
                  <div className="chat-tool-overlay-header">
                    <button
                      type="button"
                      className="btn btn--secondary btn--compact chat-tool-back"
                      onClick={() => setToolPanelOpen(false)}
                    >
                      Чат
                    </button>
                    <h2 className="chat-tool-overlay-title" id="chat-tool-overlay-heading">
                      {overlayToolTitle}
                    </h2>
                    <span className="chat-tool-overlay-trail" aria-hidden />
                  </div>
                  <div className="chat-tool-overlay-scroll">
                    {sidebarTab === 'progress' && (
                      <div className="sidebar-panel sidebar-panel--flush">
                        <ProgressQuitScreen />
                      </div>
                    )}
                    {sidebarTab === 'health' && (
                      <div className="sidebar-panel sidebar-panel--health-flush">
                        <HealthMilestonesScreen />
                      </div>
                    )}
                    {sidebarTab === 'settings' && (
                      <div className="sidebar-panel sidebar-panel--settings-flush">
                        <SettingsQuitScreen />
                      </div>
                    )}
                    {sidebarTab === 'support_project' && (
                      <div className="sidebar-panel sidebar-panel--support-flush">
                        <SupportProjectScreen />
                      </div>
                    )}
                    {sponsorStubSlot != null && (
                      <div className="sidebar-panel sidebar-panel--sponsor-placeholder">
                        <div className="sponsor-slot-stub">
                          <p className="sponsor-slot-stub-tag">Заглушка</p>
                          <p className="sponsor-slot-stub-title">Слот спонсора {sponsorStubSlot}</p>
                          <p className="sponsor-slot-stub-desc">
                            Здесь позже будет логотип, короткий текст или ссылка на партнёра. Раздел пока офлайн —
                            добавим, когда появятся согласованные материалы.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {!toolPanelOpen && error && <div className="chat-error">{error}</div>}

            {!toolPanelOpen && (
            <div
              className={'chat-composer-wrap' + (guestComposerLocked ? ' chat-composer-wrap--blocked' : '')}
            >
              <form className="chat-form" onSubmit={onSend}>
                <div className="chat-form-input-wrap">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      guestComposerLocked
                        ? 'Только вход — отправка временно недоступна'
                        : loading
                          ? 'Ждём ответ…'
                          : 'Сообщение'
                    }
                    disabled={loading || bootstrapping || guestComposerLocked}
                    aria-label="Сообщение"
                    autoComplete="off"
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn--primary btn--icon btn-send"
                  disabled={loading || bootstrapping || guestComposerLocked}
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
            )}
          </div>
        </div>

        <aside className="chat-rail" aria-label="Разделы">
          <div className="chat-rail__track">
            {RAIL_ITEMS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={
                  'rail-tab' +
                  (sidebarTab === t.id && toolPanelOpen ? ' rail-tab--active' : '')
                }
                onClick={() => toggleRailTab(t.id)}
                aria-pressed={sidebarTab === t.id && toolPanelOpen}
                aria-label={t.label}
              >
                <span className="rail-tab__icon" aria-hidden>
                  {t.icon}
                </span>
                <span className="rail-tab__label">{t.label}</span>
              </button>
            ))}
            <div className="chat-rail-sponsors">
              <p className="chat-rail-sponsors-title">Наши спонсоры</p>
              <div className="chat-rail-sponsors-slots">
                {SPONSOR_SLOT_IDS.map((slotId, i) => (
                  <button
                    key={slotId}
                    type="button"
                    className={
                      'rail-tab rail-tab--sponsor-slot' +
                      (sidebarTab === slotId && toolPanelOpen ? ' rail-tab--active' : '')
                    }
                    onClick={() => toggleRailTab(slotId)}
                    aria-pressed={sidebarTab === slotId && toolPanelOpen}
                    aria-label={`Слот спонсора ${i + 1}`}
                  >
                    <span className="rail-tab__icon rail-tab__icon--plus" aria-hidden>
                      +
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
