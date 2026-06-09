import { useState } from 'react';
import { getSupabase } from './supabaseClient';

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [oauthBusy, setOauthBusy] = useState<'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (!sb) {
      setError('Supabase не настроен.');
      return;
    }
    setError(null);
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

  async function onSignOut() {
    if (!sb) {
      onClose();
      return;
    }
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
          Вход
        </h2>
        <p className="auth-modal-lead">Сохраняй историю и прогресс между заходами.</p>

        <div className="auth-oauth-row">
          <button
            type="button"
            className="btn btn--secondary btn--block auth-oauth-btn"
            disabled={oauthBusy !== null}
            onClick={() => void signInWithProvider('google')}
          >
            {oauthBusy === 'google' ? '…' : 'Войти через Google'}
          </button>
        </div>

        {error ? <p className="auth-modal-error">{error}</p> : null}

        <div className="auth-modal-footer">
          <button type="button" className="btn btn--secondary btn--compact" onClick={() => void onSignOut()}>
            Выйти на этом устройстве
          </button>
        </div>
      </div>
    </div>
  );
}
