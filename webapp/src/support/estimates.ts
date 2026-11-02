export type QuitEstimates = {
  cigarettesPerDay: number;
  packPrice: number;
  packSize: number;
  currency: string;
};

export type EstimateInterval = {
  startedAt: string;
  endedAt: string;
};

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'KZT'] as const;

export function parseEstimates(raw: unknown): QuitEstimates | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const cigarettesPerDay = Number(row.cigarettesPerDay ?? row.cigarettes_per_day);
  const packPrice = Number(row.packPrice ?? row.pack_price);
  const packSize = Number(row.packSize ?? row.pack_size);
  const currency = String(row.currency ?? '').trim().toUpperCase();
  if (!Number.isFinite(cigarettesPerDay) || cigarettesPerDay <= 0 || cigarettesPerDay > 80) return null;
  if (!Number.isFinite(packPrice) || packPrice <= 0 || packPrice > 10000) return null;
  if (!Number.isFinite(packSize) || packSize < 1 || packSize > 50) return null;
  if (!/^[A-Z]{3}$/.test(currency)) return null;
  return {
    cigarettesPerDay: Math.round(cigarettesPerDay * 10) / 10,
    packPrice: Math.round(packPrice * 100) / 100,
    packSize: Math.round(packSize),
    currency,
  };
}

export function intervalDurationMs(interval: EstimateInterval, nowMs = Date.now()): number {
  const start = Date.parse(interval.startedAt);
  if (!Number.isFinite(start)) return 0;
  const end = interval.endedAt ? Date.parse(interval.endedAt) : nowMs;
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, end - start);
}

export function allStretchesMs(intervals: EstimateInterval[], nowMs = Date.now()): number {
  return intervals.reduce((sum, item) => sum + intervalDurationMs(item, nowMs), 0);
}

export function estimateFromMs(estimates: QuitEstimates, ms: number) {
  const days = ms / 86400000;
  const cigarettes = estimates.cigarettesPerDay * days;
  const money = estimates.packSize > 0 ? (cigarettes / estimates.packSize) * estimates.packPrice : 0;
  return {
    days,
    cigarettes: Math.max(0, cigarettes),
    money: Math.max(0, money),
  };
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: amount < 10 ? 2 : 0 }).format(amount);
  } catch {
    return `${amount.toFixed(amount < 10 ? 2 : 0)} ${currency}`;
  }
}

export function formatCigarettes(count: number): string {
  if (count < 0.05) return '0';
  if (count < 10) return count.toFixed(1).replace(/\.0$/, '');
  return String(Math.round(count));
}
