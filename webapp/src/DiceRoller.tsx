import { useCallback, useState } from 'react';

type Props = {
  disabled: boolean;
  onRoll: (value: number) => void;
  variant?: 'roll' | 'play' | 'ready';
};

export function DiceRoller({ disabled, onRoll, variant = 'roll' }: Props) {
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
        className={
          'dice-roller__btn'
          + (variant === 'play' || variant === 'ready' ? ' dice-roller__btn--play' : '')
          + (rolling ? ' dice-roller__btn--rolling' : '')
          + (disabled ? ' dice-roller__btn--disabled' : '')
        }
        onClick={handleClick}
        disabled={disabled || rolling}
        aria-label={
          variant === 'play'
            ? 'Играть'
            : variant === 'ready'
              ? 'Бросить кубик'
              : disabled ? 'Кубик недоступен — дождись ответа' : 'Бросить кубик'
        }
        title={
          variant === 'play'
            ? 'Играть'
            : variant === 'ready'
              ? 'Бросить кубик (1–6)'
              : disabled ? 'Сначала ответь — потом можно бросить' : 'Бросить кубик (1–6)'
        }
      >
        <span className="dice-roller__face" aria-hidden>
          {display ?? '🎲'}
        </span>
        {variant === 'play' && <span className="dice-roller__cta">{rolling ? 'Игра…' : 'Играть'}</span>}
        {variant === 'ready' && <span className="dice-roller__cta">{rolling ? 'Бросок…' : 'Бросить кубик'}</span>}
      </button>
      {variant === 'roll' && !disabled && !rolling && (
        <span className="dice-roller__hint">Бросить кубик</span>
      )}
    </div>
  );
}
