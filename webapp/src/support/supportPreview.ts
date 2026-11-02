import { defaultProgress, type PlayerProgress } from '../auth/progressModel';

export function previewProgress(kind: string, nowMs = Date.now()): PlayerProgress {
  const base = defaultProgress();
  const estimates = {
    cigarettesPerDay: 12,
    packPrice: 8.5,
    packSize: 20,
    currency: 'USD',
  };
  const support = {
    ...base,
    seenIntro: true,
    appStage: 'support' as const,
    smokingStatus: 'abstaining' as const,
    sceneId: 'truth' as const,
    completionOffered: true,
  };
  if (kind === 'smoking') {
    return {
      ...support,
      smokingStatus: 'smoking',
      estimates,
      intervals: [{
        id: 'past',
        startedAt: new Date(nowMs - 3 * 86400000).toISOString(),
        endedAt: new Date(nowMs - 3600000).toISOString(),
        source: 'now',
      }],
    };
  }
  const offset = kind === 'fresh' ? 8000 : kind === 'early' ? 8 * 60000 : 3 * 86400000 + 2 * 3600000;
  const startedAt = new Date(nowMs - offset).toISOString();
  return {
    ...support,
    estimates: kind === 'setup' ? null : estimates,
    currentIntervalId: 'live',
    intervals: [{ id: 'live', startedAt, endedAt: '', source: 'now' }],
    supportChat: kind === 'fresh' ? [] : [{ id: 'a1', role: 'assistant', content: 'What is this minute like?' }],
  };
}
