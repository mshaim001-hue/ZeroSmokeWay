import { sceneOf } from '../scenes/catalog';
import './gate.css';

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.5 5.6-6.4 7.1l.1.1 6.3 5.3C37.3 42.2 44 38 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

export function Landing({
  busy,
  issue,
  onGoogle,
}: {
  busy: boolean;
  issue: string;
  onGoogle: () => void;
}) {
  const poster = sceneOf('pitcher').poster;
  return (
    <main className="scene1-app">
      <img className="gate-frame" src={poster} alt="" />
      <div className="gate-veil" />
      <div className="gate-sheet is-landing">
        <h1 className="gate-title">ZeroSmokeWay</h1>
        <p className="gate-question">What keeps you smoking?</p>
        <p className="gate-about">Explore how it started, what keeps you coming back, and what quitting means to you.</p>
        <div className="gate-actions">
          {issue ? <p className="gate-error" role="status">{issue}</p> : null}
          <button type="button" className="gate-google" onClick={onGoogle} disabled={busy}>
            <GoogleMark />
            {busy ? 'Opening Google…' : 'Continue with Google'}
          </button>
        </div>
      </div>
      <footer className="gate-foot">
        <p className="gate-kicker">Follow the journey</p>
        <p className="gate-social">
          <a href="https://x.com/MaxShaim" target="_blank" rel="noopener noreferrer">X</a>
          <span aria-hidden="true">·</span>
          <a href="https://www.facebook.com/profile.php?id=61595820547462" target="_blank" rel="noopener noreferrer">Facebook</a>
          <span aria-hidden="true">·</span>
          <a href="https://www.threads.com/@mshaim001" target="_blank" rel="noopener noreferrer">Threads</a>
        </p>
        <p className="gate-credit">Built by <a href="https://underdot.net" target="_blank" rel="noopener noreferrer">Underdot.net</a></p>
        <p className="gate-credit">Built for the Meta Global AI Developer Hackathon 2026</p>
      </footer>
    </main>
  );
}
