import { useEffect, useRef, useState } from 'react';
import { Scene1App } from '../scenes/act1/Scene1App';
import { FIRST_SCENE } from '../scenes/catalog';
import { isAuthConfigured, supabase } from './client';
import { Landing } from './Landing';
import { Intro } from './Intro';
import { loadProgress, saveProgress } from './progress';
import type { PlayerProgress } from './progressModel';
import { enterFullscreen } from '../fullscreen';
import './gate.css';

type View = 'boot' | 'landing' | 'intro' | 'play';

function cleanAuthParams() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('code') && !url.searchParams.has('error') && !url.hash.includes('access_token')) return;
  url.search = '';
  url.hash = '';
  window.history.replaceState({}, '', url.pathname);
}

export function AuthGate() {
  const [view, setView] = useState<View>('boot');
  const [userId, setUserId] = useState<string | null>(null);
  const [progress, setProgress] = useState<PlayerProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState('');
  const readyUser = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromRedirect = params.get('error_description') || params.get('error');
    if (fromRedirect) setIssue(fromRedirect);

    if (!isAuthConfigured()) {
      setView('landing');
      return;
    }

    const { data } = supabase().auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function applySession(session: { user: { id: string } } | null) {
    if (!session) {
      readyUser.current = null;
      setUserId(null);
      setProgress(null);
      setBusy(false);
      setView('landing');
      return;
    }
    if (readyUser.current === session.user.id) return;
    const next = await loadProgress(session.user.id);
    readyUser.current = session.user.id;
    setUserId(session.user.id);
    setProgress(next);
    setBusy(false);
    cleanAuthParams();
    setView(next.seenIntro ? 'play' : 'intro');
  }

  async function signInGoogle() {
    enterFullscreen();
    setIssue('');
    if (!isAuthConfigured()) {
      setIssue('Google sign-in is not configured yet.');
      return;
    }
    setBusy(true);
    const { error } = await supabase().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      setBusy(false);
      setIssue(error.message);
    }
  }

  async function startPath() {
    if (!userId) return;
    setBusy(true);
    const next: PlayerProgress = {
      sceneId: FIRST_SCENE,
      phase: 'idle',
      chat: [],
      seenIntro: true,
    };
    await saveProgress(userId, next);
    setProgress(next);
    setBusy(false);
    setView('play');
  }

  async function signOut() {
    readyUser.current = null;
    if (isAuthConfigured()) await supabase().auth.signOut();
    setUserId(null);
    setProgress(null);
    setView('landing');
  }

  if (view === 'boot') return <main className="scene1-app" aria-busy="true" />;
  if (view === 'landing') return <Landing busy={busy} issue={issue} onGoogle={() => void signInGoogle()} />;
  if (view === 'intro') return <Intro busy={busy} onStart={() => void startPath()} onSignOut={() => void signOut()} />;
  if (!userId || !progress) return <Landing busy={false} issue={issue} onGoogle={() => void signInGoogle()} />;
  return <Scene1App userId={userId} initial={progress} onSignOut={() => void signOut()} />;
}
