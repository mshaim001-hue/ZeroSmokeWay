import { useEffect, useState } from 'react';
import {
  calcMetrics,
  defaultCigsInPack,
  defaultCigsPerDay,
  defaultPricePerPack,
  formatDurationRu,
  formatMoneyRu,
  LS_CIGS_IN_PACK,
  LS_CIGS_PER_DAY,
  LS_PRICE_PER_PACK,
  LS_QUIT_AT_MS,
  readNumber,
  readQuitAtMs,
  setQuitAtMs,
} from './quitTracking';

const RING_R = 38;
const RING_C = 2 * Math.PI * RING_R;

export function ProgressQuitScreen() {
  const [now, setNow] = useState(() => Date.now());
  const [quitAt, setQuitAt] = useState<number | null>(() => readQuitAtMs());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === LS_QUIT_AT_MS || e.key === null) {
        setQuitAt(readQuitAtMs());
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const metrics = calcMetrics(now, quitAt);
  const dashOffset = RING_C * (1 - metrics.yearPercent / 100);

  function onStartQuit() {
    const t = Date.now();
    setQuitAtMs(t);
    setQuitAt(t);
  }

  function onClearQuit() {
    localStorage.removeItem(LS_QUIT_AT_MS);
    setQuitAt(null);
  }

  return (
    <div className="progress-quit-root">
      {!quitAt ? (
        <div className="progress-empty-card">
          <p className="progress-empty-text">
            Установи дату отказа — появятся день, кольцо «1 год» и счётчики как в трекере.
          </p>
          <button type="button" className="btn btn--primary btn--block" onClick={onStartQuit}>
            Я бросил — начать отсчёт с сейчас
          </button>
        </div>
      ) : (
        <div className="progress-hero-card">
          <div className="progress-day-label">День {metrics.dayNumber}</div>

          <div className="progress-ring-wrap">
            <svg className="progress-ring-svg" viewBox="0 0 100 100" aria-hidden>
              <circle className="progress-ring-bg" cx="50" cy="50" r={RING_R} />
              <circle
                className="progress-ring-fg"
                cx="50"
                cy="50"
                r={RING_R}
                strokeDasharray={RING_C}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="progress-ring-labels">
              <span className="progress-pct">
                {metrics.yearPercent.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} %
              </span>
              <span className="progress-year-tag">1 ГОД</span>
            </div>
          </div>

          <p className="progress-quote">Теперь я у руля!</p>

          <div className="progress-stats-wrap">
            <div className="progress-stats-grid">
              <div className="progress-stat-cell">
                <div className="progress-stat-value">{formatDurationRu(metrics.elapsed)}</div>
                <div className="progress-stat-caption">Не курю</div>
              </div>
              <div className="progress-stat-cell">
                <div className="progress-stat-value">{formatMoneyRu(metrics.moneySaved)} ₸</div>
                <div className="progress-stat-caption">Денег сэкономлено</div>
              </div>
              <div className="progress-stat-cell">
                <div className="progress-stat-value">{formatDurationRu(metrics.lifeRegainedMs)}</div>
                <div className="progress-stat-caption">Жизнь возвращена</div>
              </div>
              <div className="progress-stat-cell">
                <div className="progress-stat-value">
                  {metrics.cigsAvoided.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}
                </div>
                <div className="progress-stat-caption">Сигарет не выкурено</div>
              </div>
            </div>
          </div>

          <button type="button" className="btn-link progress-reset-actions" onClick={onClearQuit}>
            Сбросить дату отказа
          </button>
        </div>
      )}
    </div>
  );
}

/** Поля настроек для расчёта денег и сигарет — вкладка «Настройки». */
export function QuitTrackingSettingsForm() {
  const [cigs, setCigs] = useState(() => readNumber(LS_CIGS_PER_DAY, defaultCigsPerDay));
  const [packP, setPackP] = useState(() => readNumber(LS_PRICE_PER_PACK, defaultPricePerPack));
  const [inPack, setInPack] = useState(() => readNumber(LS_CIGS_IN_PACK, defaultCigsInPack));

  useEffect(() => {
    localStorage.setItem(LS_CIGS_PER_DAY, String(cigs));
  }, [cigs]);
  useEffect(() => {
    localStorage.setItem(LS_PRICE_PER_PACK, String(packP));
  }, [packP]);
  useEffect(() => {
    localStorage.setItem(LS_CIGS_IN_PACK, String(inPack));
  }, [inPack]);

  return (
    <div className="quit-settings-form">
      <p className="quit-settings-lead">Для блока «Прогресс» (деньги и сигареты). Хранится только в браузере.</p>
      <label className="quit-settings-field">
        Сигарет в день «до»
        <input type="number" min={0} step={1} value={cigs} onChange={(e) => setCigs(Number(e.target.value))} />
      </label>
      <label className="quit-settings-field">
        Цена пачки, ₸
        <input type="number" min={0} step={10} value={packP} onChange={(e) => setPackP(Number(e.target.value))} />
      </label>
      <label className="quit-settings-field">
        Сигарет в пачке
        <input type="number" min={1} step={1} value={inPack} onChange={(e) => setInPack(Number(e.target.value))} />
      </label>
    </div>
  );
}
