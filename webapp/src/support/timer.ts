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

export function formatSmokeFree(startedAt: string, nowMs = Date.now()) {
  const parts = smokeFreeParts(startedAt, nowMs);
  const chunks = [];
  if (parts.days) chunks.push(`${parts.days}d`);
  if (parts.hours || parts.days) chunks.push(`${parts.hours}h`);
  chunks.push(`${parts.minutes}m`);
  return chunks.join(' ');
}
