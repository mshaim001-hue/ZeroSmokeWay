/** Локальные ключи для трекера отказа (без сервера). */
export const LS_QUIT_AT_MS = 'zsw-quit-at-ms';
export const LS_CIGS_PER_DAY = 'zsw-cigs-per-day';
export const LS_PRICE_PER_PACK = 'zsw-price-per-pack';
export const LS_CIGS_IN_PACK = 'zsw-cigs-in-pack';

export const defaultCigsPerDay = 20;
export const defaultPricePerPack = 1500;
export const defaultCigsInPack = 20;

const DAY_MS = 86400000;
const YEAR_MS = 365 * DAY_MS;

/** Доля «жизни возвращено» как в популярных трекерах (~23% от времени без дыма). */
export const LIFE_REGAINED_RATIO = 0.228;

export function readQuitAtMs(): number | null {
  try {
    const raw = localStorage.getItem(LS_QUIT_AT_MS);
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function setQuitAtMs(ms: number) {
  localStorage.setItem(LS_QUIT_AT_MS, String(ms));
}

export function readNumber(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const n = parseFloat(raw);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

export function calcMetrics(now: number, quitAt: number | null) {
  if (quitAt == null || quitAt > now) {
    return {
      elapsed: 0,
      dayNumber: 0,
      yearPercent: 0,
      moneySaved: 0,
      cigsAvoided: 0,
      lifeRegainedMs: 0,
    };
  }
  const elapsed = now - quitAt;
  const cigsPerDay = readNumber(LS_CIGS_PER_DAY, defaultCigsPerDay);
  const pricePack = readNumber(LS_PRICE_PER_PACK, defaultPricePerPack);
  const inPack = readNumber(LS_CIGS_IN_PACK, defaultCigsInPack);
  const pricePerCig = inPack > 0 ? pricePack / inPack : 0;

  const dayNumber = Math.floor(elapsed / DAY_MS) + 1;
  const yearPercent = Math.min(100, (elapsed / YEAR_MS) * 100);
  const cigsAvoided = (elapsed / DAY_MS) * cigsPerDay;
  const moneySaved = cigsAvoided * pricePerCig;
  const lifeRegainedMs = elapsed * LIFE_REGAINED_RATIO;

  return {
    elapsed,
    dayNumber,
    yearPercent,
    moneySaved,
    cigsAvoided,
    lifeRegainedMs,
  };
}

export function formatDurationRu(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}д ${h}ч ${m}м ${sec}с`;
}

export function formatMoneyRu(n: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
