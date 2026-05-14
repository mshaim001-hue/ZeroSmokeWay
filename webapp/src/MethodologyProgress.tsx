/** Три шага методики в чате (отдельно от кольца «дней без дыма» на вкладке Прогресс). */

type Props = {
  phase: string;
  coverageScore?: number;
};

const STEPS = [
  { short: '1', title: 'Знакомство' },
  { short: '2', title: 'Анамнез' },
  { short: '3', title: 'Мифы' },
] as const;

function phaseRank(p: string): number {
  if (p === 'welcome') return 0;
  if (p === 'anamnesis') return 1;
  if (p === 'myth_busting') return 2;
  if (p === 'support') return 3;
  return 0;
}

function segState(index: 0 | 1 | 2, phase: string): { filled: boolean; current: boolean } {
  const p = phase || 'welcome';
  const r = phaseRank(p);
  if (r >= 3) {
    return { filled: true, current: false };
  }
  return {
    filled: index < r,
    current: index === r,
  };
}

export function MethodologyProgress({ phase, coverageScore }: Props) {
  const p = phase || 'welcome';
  const cov =
    typeof coverageScore === 'number' && Number.isFinite(coverageScore)
      ? Math.round(coverageScore * 100)
      : null;

  return (
    <div className="methodology-progress" aria-label="Этапы методики в чате">
      <div className="methodology-progress__segments">
        {STEPS.map((s, i) => {
          const idx = i as 0 | 1 | 2;
          const { filled, current } = segState(idx, p);
          return (
            <div
              key={s.title}
              className={
                'methodology-progress__seg' +
                (filled ? ' methodology-progress__seg--filled' : '') +
                (current ? ' methodology-progress__seg--current' : '')
              }
              title={s.title}
            >
              <span className="methodology-progress__seg-num">{s.short}</span>
              <span className="methodology-progress__seg-label">{s.title}</span>
            </div>
          );
        })}
      </div>
      {cov != null ? (
        <p className="methodology-progress__hint" aria-hidden>
          Покрытие анамнеза: {cov}%
        </p>
      ) : null}
    </div>
  );
}
