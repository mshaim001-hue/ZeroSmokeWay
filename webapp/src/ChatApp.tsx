import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import { ChatMessage, postOrchestrator } from './api';

const PHASE_WELCOME = 'welcome';

function nowIso() {
  return new Date().toISOString();
}

export function ChatApp() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState(PHASE_WELCOME);
  const [plan, setPlan] = useState<Record<string, unknown> | null>(null);
  const [anamnesis, setAnamnesis] = useState<Record<string, unknown> | null>(null);
  const started = useRef(false);
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
    if (started.current) return;
    started.current = true;
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
      const data = await postOrchestrator({
        message: text,
        conversationHistory: history,
        anamnesisData: anamnesis,
        phase,
        userProfile: null,
        currentPlan: plan,
      });

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

  async function signOut() {
    await supabase?.auth.signOut();
    window.location.reload();
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <header style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <strong>ZeroSmokeWay</strong>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={startJourney} style={{ padding: '6px 10px' }}>
            Сначала
          </button>
          <button type="button" onClick={() => void signOut()} style={{ padding: '6px 10px' }}>
            Выйти
          </button>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: 12,
              display: 'flex',
              justifyContent: m.isUser ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: 14,
                whiteSpace: 'pre-wrap',
                background: m.isUser ? '#2e7d32' : '#eef1f4',
                color: m.isUser ? '#fff' : '#111',
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </main>

      {error && (
        <div style={{ padding: '0 16px', color: '#b00020', fontSize: 14 }}>
          {error}
        </div>
      )}

      <form onSubmit={onSend} style={{ padding: 12, borderTop: '1px solid #e0e0e0', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Напишите сообщение…"
          style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #ccc' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '0 20px', borderRadius: 8, border: 'none', background: '#2e7d32', color: '#fff', cursor: 'pointer' }}>
          {loading ? '…' : 'Отправить'}
        </button>
      </form>
    </div>
  );
}
