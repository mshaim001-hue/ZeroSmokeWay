import { FormEvent, useState } from 'react';
import { supabase } from './supabaseClient';

type Props = {
  onAuthed: () => void;
};

export function AuthPanel({ onAuthed }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
      onAuthed();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '48px auto', padding: 24, background: '#fff', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>
      <h1 style={{ marginTop: 0 }}>ZeroSmokeWay</h1>
      <p style={{ color: '#555' }}>Войдите или зарегистрируйтесь (Supabase Auth).</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button type="button" disabled={mode === 'login'} onClick={() => setMode('login')}>
          Вход
        </button>
        <button type="button" disabled={mode === 'signup'} onClick={() => setMode('signup')}>
          Регистрация
        </button>
      </div>
      <form onSubmit={onSubmit}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', marginTop: 4, padding: 8 }} />
        </label>
        <label style={{ display: 'block', marginBottom: 16 }}>
          Пароль
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', marginTop: 4, padding: 8 }} />
        </label>
        <button type="submit" disabled={busy} style={{ width: '100%', padding: 12, background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          {busy ? '…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        </button>
      </form>
      {error && <p style={{ color: '#b00020', marginTop: 12 }}>{error}</p>}
    </div>
  );
}
