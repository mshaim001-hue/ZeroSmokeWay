import { sceneOf } from '../scenes/catalog';
import './gate.css';

export function Intro({
  busy,
  onStart,
  onSignOut,
}: {
  busy: boolean;
  onStart: () => void;
  onSignOut: () => void;
}) {
  const poster = sceneOf('pitcher').poster;
  return (
    <main className="scene1-app">
      <img className="gate-frame" src={poster} alt="" />
      <div className="gate-veil" />
      <div className="gate-scroll">
        <div className="gate-sheet">
          <div className="gate-toolbar">
            <p className="gate-kicker">ZeroSmokeWay</p>
            <button type="button" className="gate-signout is-inline" onClick={onSignOut}>Sign out</button>
          </div>
          <h1 className="gate-title">You don’t have to quit to begin.</h1>
          <div className="gate-copy">
            <p>You can go through ZeroSmokeWay while you’re still smoking. There’s no need to set a quit date or promise yourself anything before you start.</p>
            <p>For now, just explore what smoking means to you.</p>
            <p className="gate-line">Short scenes. Honest conversations.</p>
            <p>Four acts explore how it started, what keeps you coming back, and how you feel about quitting.</p>
            <p>After each scene, there’s space for your own story. Say what feels familiar, what doesn’t, or what you disagree with.</p>
            <p>Take your time.</p>
            <p>You don’t have to finish in one sitting.</p>
          </div>
          <div className="gate-sticky">
            <button type="button" className="gate-start" onClick={onStart} disabled={busy}>
              {busy ? 'Opening…' : 'Begin'}
            </button>
            <p className="gate-note">An experience for reflection. Not medical advice.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
