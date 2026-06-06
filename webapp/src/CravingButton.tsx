import { useState } from 'react';

type CravingStep = 'idle' | 'active' | 'breathing' | 'done';

interface Props {
  onSendMessage: (text: string) => void;
  disabled?: boolean;
}

const BREATHING_SECONDS = 60;

export function CravingButton({ onSendMessage, disabled }: Props) {
  const [step, setStep] = useState<CravingStep>('idle');
  const [secondsLeft, setSecondsLeft] = useState(BREATHING_SECONDS);
  const [timerRef, setTimerRef] = useState<ReturnType<typeof setInterval> | null>(null);

  function handleClick() {
    setStep('active');
  }

  function startBreathing() {
    setStep('breathing');
    let s = BREATHING_SECONDS;
    const id = setInterval(() => {
      s -= 1;
      setSecondsLeft(s);
      if (s <= 0) {
        clearInterval(id);
        setStep('done');
        setSecondsLeft(BREATHING_SECONDS);
      }
    }, 1000);
    setTimerRef(id);
  }

  function handleSkip() {
    if (timerRef) clearInterval(timerRef);
    setStep('done');
    setSecondsLeft(BREATHING_SECONDS);
  }

  function handleTellAlex() {
    setStep('idle');
    onSendMessage('Сейчас сильно тянет закурить');
  }

  function handleDone() {
    setStep('idle');
    onSendMessage('Пережил тягу — прошло само');
  }

  if (step === 'idle') {
    return (
      <button
        type="button"
        className="craving-btn"
        onClick={handleClick}
        disabled={disabled}
        aria-label="Сейчас трудно — нажми"
      >
        Сейчас трудно
      </button>
    );
  }

  if (step === 'active') {
    return (
      <div className="craving-panel">
        <p className="craving-panel__title">Тяга длится 3–5 минут и проходит сама.</p>
        <ol className="craving-panel__steps">
          <li>Выпей стакан воды — прямо сейчас</li>
          <li>Встань, пройдись или умойся</li>
          <li>Подыши медленно — 4 секунды вдох, 4 выдох</li>
        </ol>
        <div className="craving-panel__actions">
          <button type="button" className="btn btn--primary" onClick={startBreathing}>
            Дышать со мной
          </button>
          <button type="button" className="btn btn--secondary" onClick={handleTellAlex}>
            Рассказать Алексу
          </button>
        </div>
      </div>
    );
  }

  if (step === 'breathing') {
    const progress = ((BREATHING_SECONDS - secondsLeft) / BREATHING_SECONDS) * 100;
    const phase = secondsLeft % 8 < 4 ? 'Вдох...' : 'Выдох...';
    return (
      <div className="craving-panel craving-panel--breathing">
        <p className="craving-panel__phase">{phase}</p>
        <div className="craving-panel__bar">
          <div className="craving-panel__bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="craving-panel__timer">{secondsLeft} сек</p>
        <button type="button" className="btn btn--secondary btn--compact" onClick={handleSkip}>
          Уже лучше
        </button>
      </div>
    );
  }

  // done
  return (
    <div className="craving-panel craving-panel--done">
      <p className="craving-panel__title">Прошло?</p>
      <div className="craving-panel__actions">
        <button type="button" className="btn btn--primary" onClick={handleDone}>
          Да, прошло
        </button>
        <button type="button" className="btn btn--secondary" onClick={handleTellAlex}>
          Нет, рассказать Алексу
        </button>
      </div>
    </div>
  );
}
