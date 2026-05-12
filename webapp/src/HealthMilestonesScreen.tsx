import { useEffect, useState } from 'react';
import { LS_QUIT_AT_MS, readQuitAtMs } from './quitTracking';

/** Вехи по часам + «вес» в круге после достижения (как в классических трекерах). */
export const HEALTH_MILESTONES = [
  { hours: 1, weight: 2.3, line: 'Нормализация артериального давления и пульса' },
  { hours: 2, weight: 1.2, line: 'Улучшение периферического кровообращения' },
  { hours: 3, weight: 0.95, line: 'Снижается уровень никотина в крови' },
  { hours: 4, weight: 0.6, line: 'Возвращение температуры конечностей к норме' },
  { hours: 5, weight: 0.52, line: 'Обоняние и вкус становятся острее' },
  { hours: 6, weight: 0.4, line: 'Меньше выражен неприятный запах изо рта' },
  { hours: 7, weight: 0.35, line: 'Кожа получает больше кислорода и питательных веществ' },
  { hours: 8, weight: 0.3, line: 'Нормализация уровня кислорода (O₂) в крови' },
  { hours: 9, weight: 0.25, line: 'Снижение уровня угарного газа, лёгкие очищаются' },
  { hours: 10, weight: 0.2, line: 'Улучшение работы красных кровяных телец' },
] as const;

const HOUR_MS = 3600000;
const R = 22;
const C = 2 * Math.PI * R;

function formatHoursLabel(hours: number): string {
  const h = hours % 10;
  const hx = hours % 100;
  if (hx >= 11 && hx <= 14) return `${hours} часов`;
  if (h === 1) return `${hours} час`;
  if (h >= 2 && h <= 4) return `${hours} часа`;
  return `${hours} часов`;
}

type Props = {
  onBack?: () => void;
};

export function HealthMilestonesScreen({ onBack }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [storageRev, setStorageRev] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === LS_QUIT_AT_MS || e.key === null) {
        setStorageRev((t) => t + 1);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const quitAt = readQuitAtMs();
  const elapsed = quitAt != null && quitAt <= now ? now - quitAt : 0;

  return (
    <div className="health-screen" data-storage-rev={storageRev}>
      <div className="health-screen-bg" aria-hidden />
      <div className="health-screen-dim" aria-hidden />

      <header className="settings-app-header health-screen-topbar">
        <button type="button" className="settings-bar-btn" onClick={() => onBack?.()} aria-label="Назад">
          ←
        </button>
        <span className="settings-bar-title">Здоровье</span>
        <span className="settings-bar-spacer" aria-hidden />
      </header>

      {!quitAt ? (
        <div className="health-empty-overlay">
          <p className="health-empty-text">Сначала начни отсчёт на вкладке «Прогресс» — тогда здесь появится путь восстановления.</p>
        </div>
      ) : (
        <ul className="health-list">
          {HEALTH_MILESTONES.map((m) => {
            const targetMs = m.hours * HOUR_MS;
            const toGate = Math.min(100, (elapsed / targetMs) * 100);
            const done = elapsed >= targetMs;
            const dashOffset = C * (1 - Math.min(100, toGate) / 100);
            const centerLabel = done ? `${m.weight}%` : `${toGate.toFixed(1)}%`;

            return (
              <li key={m.hours} className="health-card">
                <div className="health-card-ring">
                  <svg className="health-ring-svg" viewBox="0 0 56 56" aria-hidden>
                    <circle className="health-ring-bg" cx="28" cy="28" r={R} />
                    <circle
                      className={done ? 'health-ring-fg health-ring-fg--done' : 'health-ring-fg'}
                      cx="28"
                      cy="28"
                      r={R}
                      strokeDasharray={C}
                      strokeDashoffset={dashOffset}
                      transform="rotate(-90 28 28)"
                    />
                  </svg>
                  <div className="health-ring-center">
                    <span className="health-ring-pct">{centerLabel}</span>
                    {done && <span className="health-ring-star">★</span>}
                  </div>
                </div>
                <div className="health-card-text">
                  <div className="health-card-time">{formatHoursLabel(m.hours)}</div>
                  <div className="health-card-desc">{m.line}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
