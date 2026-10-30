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
          <h1 className="gate-title">Not another lecture</h1>
          <div className="gate-copy">
            <p>Not another lecture about how bad smoking is. You already know. Quit-apps know it too. People keep smoking because they keep a private story: “I can stop whenever I want.” “It calms me.” “Just this one.”</p>
            <p>ZeroSmokeWay is a mobile cinematic path. Each scene is a short film — a fairy-tale picture of the trap. After the film, Meta Muse Spark talks with you. It does not run a questionnaire. It stays with your words and decides whether to hold, probe, or open the next scene.</p>
            <h2>What it is not</h2>
            <ul>
              <li>Not a nicotine-replacement shop.</li>
              <li>Not medical advice, and not a claim that it will make you quit.</li>
              <li>Not a chatbot wrapper with a prepared list of questions.</li>
            </ul>
            <h2>How a scene works</h2>
            <p>You watch. Then the chat is the whole screen. Muse speaks first. The server — not the button on the phone — decides if you have tied the picture to your own smoking. Only then does the next film unlock.</p>
            <p>Scene 1 is a bee in a pitcher plant, sure it can leave whenever it wants. Scene 13 is the last cigarette in a cell whose door is already open. The cigarette was the prison.</p>
            <h2>Carr, without the brand</h2>
            <p>Allen Carr’s Easyway is an influence: the trap is in the head, not a lack of willpower. This is not an official Carr product. The films are original. The talk is live.</p>
          </div>
          <div className="gate-sticky">
            <button type="button" className="gate-start" onClick={onStart} disabled={busy}>
              {busy ? 'Opening…' : 'Watch the first film'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
