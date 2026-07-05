import { useCallback, useState } from 'react';

type Props = {
  disabled: boolean;
  onRoll: (value: number) => void;
};

export function DiceRoller({ disabled, onRoll }: Props) {
  const [display, setDisplay] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);

  const handleClick = useCallback(() => {
    if (disabled || rolling) return;

    setRolling(true);
    setDisplay(null);

    let ticks = 0;
    const interval = window.setInterval(() => {
      setDisplay(Math.floor(Math.random() * 6) + 1);
      ticks += 1;
      if (ticks >= 10) {
        window.clearInterval(interval);
        const final = Math.floor(Math.random() * 6) + 1;
        setDisplay(final);
        setRolling(false);
        onRoll(final);
      }
    }, 80);
  }, [disabled, rolling, onRoll]);

  return (
    <div className="dice-roller">
      <button
        type="button"
        className={'dice-roller__btn' + (rolling ? ' dice-roller__btn--rolling' : '') + (disabled ? ' dice-roller__btn--disabled' : '')}
        onClick={handleClick}
        disabled={disabled || rolling}
        aria-label={disabled ? 'Кубик недоступен — дождись ответа' : 'Бросить кубик'}
        title={disabled ? 'Сначала ответь на вопросы' : 'Бросить кубик (1–6)'}
      >
        <span className="dice-roller__face" aria-hidden>
          {display ?? '?'}
        </span>
      </button>
      {!disabled && !rolling && (
        <span className="dice-roller__hint">Нажми, чтобы бросить</span>
      )}
    </div>
  );
}
