import { useEffect, useState } from 'react';
import { AuthPanel } from './AuthPanel';
import { ChatApp } from './ChatApp';
import { supabase, supabaseConfigured } from './supabaseClient';

export default function App() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(Boolean(data.session));
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(Boolean(sess));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!supabaseConfigured) {
    return (
      <div style={{ maxWidth: 560, margin: '48px auto', padding: 24, background: '#fff', borderRadius: 12 }}>
        <h1>Нужна конфигурация</h1>
        <p>
          Скопируйте <code>webapp/.env.example</code> в <code>webapp/.env</code> и задайте <code>VITE_SUPABASE_URL</code> и один из ключей:{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> или <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>.
        </p>
      </div>
    );
  }

  if (!ready) {
    return <p style={{ padding: 24 }}>Загрузка…</p>;
  }

  if (!session) {
    return <AuthPanel onAuthed={() => setSession(true)} />;
  }

  return <ChatApp />;
}
