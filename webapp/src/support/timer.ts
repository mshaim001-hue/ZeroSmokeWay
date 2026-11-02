export function smokeFreeParts(startedAt: string, nowMs = Date.now()) {
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start)) return { days: 0, hours: 0, minutes: 0 };
  const minutes = Math.max(0, Math.floor((nowMs - start) / 60000));
  return {
    days: Math.floor(minutes / 1440),
    hours: Math.floor((minutes % 1440) / 60),
    minutes: minutes % 60,
  };
}

export function smokeFreeClock(startedAt: string, nowMs = Date.now()) {
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, showSeconds: true };
  }
  const totalMs = Math.max(0, nowMs - start);
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs,
    showSeconds: totalSeconds < 600,
  };
}

export function formatSmokeFree(startedAt: string, nowMs = Date.now()) {
  const parts = smokeFreeParts(startedAt, nowMs);
  const chunks = [];
  if (parts.days) chunks.push(`${parts.days}d`);
  if (parts.hours || parts.days) chunks.push(`${parts.hours}h`);
  chunks.push(`${parts.minutes}m`);
  return chunks.join(' ');
}

export function formatDuration(ms: number) {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const chunks = [];
  if (days) chunks.push(`${days}d`);
  if (hours || days) chunks.push(`${hours}h`);
  chunks.push(`${mins}m`);
  return chunks.join(' ');
}
