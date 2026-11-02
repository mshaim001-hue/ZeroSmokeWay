import { useState } from 'react';

type Props = {
  title?: string;
  copy?: string;
  nowLabel?: string;
  enterLabel?: string;
  notYetLabel?: string;
  busy?: boolean;
  issue?: string;
  onNow: () => void;
  onEnter: (when: Date) => void;
  onNotYet: () => void;
};

export function LastCigaretteDialog({
  title = 'Is the last cigarette already behind you?',
  copy = 'This starts the count from a time that already happened. You do not need to smoke another cigarette to go on.',
  nowLabel = 'Yes, start the count now',
  enterLabel = 'Use this time',
  notYetLabel = 'Not yet',
  busy = false,
  issue = '',
  onNow,
  onEnter,
  onNotYet,
}: Props) {
  const [entered, setEntered] = useState('');
  const [localIssue, setLocalIssue] = useState('');

  function submitEntered() {
    if (!entered) {
      setLocalIssue('Choose a date and time.');
      return;
    }
    const when = new Date(entered);
    if (Number.isNaN(when.getTime())) {
      setLocalIssue('That time could not be read.');
      return;
    }
    if (when.getTime() > Date.now() + 120000) {
      setLocalIssue('That time is in the future.');
      return;
    }
    setLocalIssue('');
    onEnter(when);
  }

  return (
    <div className="support-dialog" role="dialog" aria-labelledby="last-cigarette-title">
      <h2 id="last-cigarette-title">{title}</h2>
      <p>{copy}</p>
      {(issue || localIssue) ? <p className="gate-error" role="status">{issue || localIssue}</p> : null}
      <button type="button" className="scene1-next" onClick={onNow} disabled={busy}>
        {nowLabel}
      </button>
      <label className="support-time">
        Enter the time of my last cigarette
        <input
          type="datetime-local"
          value={entered}
          max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
          onChange={e => setEntered(e.target.value)}
        />
      </label>
      <button type="button" className="scene1-offer-stay" onClick={submitEntered} disabled={busy}>
        {enterLabel}
      </button>
      <button type="button" className="scene1-offer-stay" onClick={onNotYet} disabled={busy}>
        {notYetLabel}
      </button>
    </div>
  );
}
