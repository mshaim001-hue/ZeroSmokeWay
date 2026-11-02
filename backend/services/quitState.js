export const STAGES = Object.freeze(['journey', 'preparing_to_start', 'support']);
export const SMOKING = Object.freeze(['abstaining', 'smoking']);
const SKEW_MS = 120000;

export function defaultQuitState() {
  return {
    appStage: 'journey',
    completionOffered: false,
    intendedAt: null,
    currentIntervalId: null,
    smokingStatus: null,
    intervals: [],
    sceneId: 'pitcher',
    phase: 'idle',
    chat: [],
    canAdvance: false,
    offerOpen: false,
    memory: [],
    supportChat: [],
  };
}

function asDate(value, now) {
  if (value == null || value === '') return now;
  const when = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(when.getTime())) return null;
  return when;
}

export function declareIntent(state, now = new Date()) {
  if (state.appStage === 'support') return { ok: true, unchanged: true, state };
  return {
    ok: true,
    unchanged: false,
    state: {
      ...state,
      appStage: 'preparing_to_start',
      intendedAt: state.intendedAt || now.toISOString(),
      completionOffered: true,
    },
  };
}

export function confirmLastCigarette(state, at, source = 'now', now = new Date()) {
  const when = asDate(at, now);
  if (!when) return { ok: false, error: 'invalid_time' };
  if (when.getTime() > now.getTime() + SKEW_MS) return { ok: false, error: 'future_time' };
  const open = state.intervals.find(item => !item.endedAt);
  if (state.appStage === 'support' && open) {
    return { ok: true, unchanged: true, state };
  }
  const interval = {
    id: `i-${when.getTime()}`,
    startedAt: when.toISOString(),
    endedAt: null,
    source: source === 'entered' ? 'entered' : 'now',
  };
  return {
    ok: true,
    unchanged: false,
    state: {
      ...state,
      appStage: 'support',
      smokingStatus: 'abstaining',
      currentIntervalId: interval.id,
      completionOffered: true,
      intendedAt: state.intendedAt || now.toISOString(),
      intervals: [...state.intervals.filter(item => item.endedAt), interval],
    },
  };
}

export function recordSmoked(state, at, restart = false, now = new Date()) {
  if (state.appStage !== 'support') return { ok: false, error: 'not_in_support' };
  const endAt = asDate(at, now);
  if (!endAt) return { ok: false, error: 'invalid_time' };
  if (endAt.getTime() > now.getTime() + SKEW_MS) return { ok: false, error: 'future_time' };
  const intervals = state.intervals.map(item => (
    item.endedAt ? item : { ...item, endedAt: endAt.toISOString() }
  ));
  const closed = {
    ...state,
    intervals,
    currentIntervalId: null,
    smokingStatus: 'smoking',
  };
  if (restart) return confirmLastCigarette(closed, endAt, 'entered', now);
  return { ok: true, unchanged: false, state: closed };
}

export function protectSceneWrite(current, incoming) {
  if (current.appStage !== 'support') return incoming;
  return {
    ...incoming,
    appStage: 'support',
    sceneId: current.sceneId,
    phase: current.phase,
    chat: current.chat,
    canAdvance: false,
    offerOpen: false,
    smokingStatus: current.smokingStatus,
    currentIntervalId: current.currentIntervalId,
    intendedAt: current.intendedAt,
    intervals: current.intervals,
    supportChat: incoming.supportChat ?? current.supportChat,
    memory: incoming.memory ?? current.memory,
  };
}

export function smokeFreeParts(startedAt, nowMs = Date.now()) {
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start)) return { days: 0, hours: 0, minutes: 0 };
  const minutes = Math.max(0, Math.floor((nowMs - start) / 60000));
  return {
    days: Math.floor(minutes / 1440),
    hours: Math.floor((minutes % 1440) / 60),
    minutes: minutes % 60,
  };
}

export function formatSmokeFree(startedAt, nowMs = Date.now()) {
  const parts = smokeFreeParts(startedAt, nowMs);
  const chunks = [];
  if (parts.days) chunks.push(`${parts.days}d`);
  if (parts.hours || parts.days) chunks.push(`${parts.hours}h`);
  chunks.push(`${parts.minutes}m`);
  return chunks.join(' ');
}
