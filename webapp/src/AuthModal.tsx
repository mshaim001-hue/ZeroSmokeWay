import { FormEvent, useState } from 'react';
import { getSupabase } from './supabaseClient';

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<'google' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname || '/'}` : '/';

  if (!open) return null;

  const sb = getSupabase();
  if (!sb) {
    return (
      <div className="auth-modal-overlay" role="dialog" aria-modal aria-labelledby="auth-modal-title">
        <div className="auth-modal">
          <h2 id="auth-modal-title" className="auth-modal-title">
            Вход
          </h2>
          <p className="auth-modal-lead">
            Задайте переменные окружения <span className="auth-code">VITE_SUPABASE_URL</span> и{' '}
            <span className="auth-code">VITE_SUPABASE_ANON_KEY</span> (см. дашборд Supabase).
          </p>
          <button type="button" className="btn btn--primary btn--block" onClick={onClose}>
            Понятно
          </button>
        </div>
      </div>
    );
  }

  async function signInWithProvider(provider: 'google') {
    setError(null);
    setInfo(null);
    setOauthBusy(provider);
    try {
      const { data, error: err } = await sb.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUrl },
      });
      if (err) throw err;
      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setOauthBusy(null);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const em = email.trim();
    if (!em || !password) {
      setError('Введите email и пароль.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await sb.auth.signInWithPassword({ email: em, password });
        if (err) throw err;
        onClose();
        setPassword('');
      } else {
        const { data, error: err } = await sb.auth.signUp({ email: em, password });
        if (err) throw err;
        if (data.user && !data.session) {
          setInfo('Если включено подтверждение email — проверьте почту и перейдите по ссылке.');
        } else {
          onClose();
          setPassword('');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSignOut() {
    await sb.auth.signOut();
    onClose();
  }

  return (
    <div className="auth-modal-overlay" role="dialog" aria-modal aria-labelledby="auth-modal-title">
      <div className="auth-modal">
        <button type="button" className="auth-modal-close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
        <h2 id="auth-modal-title" className="auth-modal-title">
          {mode === 'signin' ? 'Вход' : 'Регистрация'}
        </h2>
        <p className="auth-modal-lead">Сохраняй историю и прогресс между заходами.</p>

        <div className="auth-oauth-row">
          <button
            type="button"
            className="btn btn--secondary btn--block auth-oauth-btn"
            disabled={busy || oauthBusy !== null}
            onClick={() => void signInWithProvider('google')}
          >
            {oauthBusy === 'google' ? '…' : 'Войти через Google'}
          </button>
        </div>

        <p className="auth-modal-divider">
          <span>или email</span>
        </p>

        <form className="auth-modal-form" onSubmit={onSubmit}>
          <label className="auth-field">
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="auth-field">
            Пароль
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </label>

          {error ? <p className="auth-modal-error">{error}</p> : null}
          {info ? <p className="auth-modal-info">{info}</p> : null}

          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
            {busy ? '…' : mode === 'signin' ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>

        <button
          type="button"
          className="auth-modal-switch"
          onClick={() => {
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
            setError(null);
            setInfo(null);
          }}
        >
          {mode === 'signin' ? 'Нет аккаунта — зарегистрироваться' : 'Уже есть аккаунт — войти'}
        </button>

        <div className="auth-modal-footer">
          <button type="button" className="btn btn--secondary btn--compact" onClick={() => void onSignOut()}>
            Выйти на этом устройстве
          </button>
        </div>
      </div>
    </div>
  );
}
