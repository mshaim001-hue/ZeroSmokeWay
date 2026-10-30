import { supabase, isAuthConfigured } from './client';
import {
  PROGRESS_CACHE,
  defaultProgress,
  newerEnvelope,
  parseEnvelope,
  parseProgress,
  persistPhase,
  type PlayerProgress,
  type ProgressEnvelope,
} from './progressModel';

function cacheKey(userId: string): string {
  return `${PROGRESS_CACHE}:${userId}`;
}

export function readCache(userId: string): ProgressEnvelope | null {
  try {
    return parseEnvelope(JSON.parse(localStorage.getItem(cacheKey(userId)) ?? ''), userId);
  } catch {
    return null;
  }
}

export function writeCache(envelope: ProgressEnvelope): void {
  try {
    localStorage.setItem(cacheKey(envelope.userId), JSON.stringify(envelope));
  } catch {
    /* private mode */
  }
}

async function readRemote(userId: string): Promise<ProgressEnvelope | null> {
  if (!isAuthConfigured()) return null;
  const { data, error } = await supabase()
    .from('player_progress')
    .select('scene_id, phase, chat, seen_intro, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    userId,
    updatedAt: Date.parse(data.updated_at) || 0,
    progress: parseProgress({
      sceneId: data.scene_id,
      phase: data.phase,
      chat: data.chat,
      seenIntro: data.seen_intro,
    }),
  };
}

async function writeRemote(envelope: ProgressEnvelope): Promise<void> {
  if (!isAuthConfigured()) return;
  const { progress, userId, updatedAt } = envelope;
  const { error } = await supabase().from('player_progress').upsert({
    user_id: userId,
    scene_id: progress.sceneId,
    phase: persistPhase(progress.phase),
    chat: progress.phase === 'chat' ? progress.chat.slice(-40) : [],
    seen_intro: progress.seenIntro,
    updated_at: new Date(updatedAt).toISOString(),
  });
  if (error) throw error;
}

export async function loadProgress(userId: string): Promise<PlayerProgress> {
  const local = readCache(userId);
  const remote = await readRemote(userId).catch(() => null);
  const winner = newerEnvelope(local, remote);
  if (!winner) return defaultProgress();
  writeCache(winner);
  if (local && remote && local.updatedAt > remote.updatedAt) {
    void writeRemote(local).catch(() => undefined);
  }
  return winner.progress;
}

export async function saveProgress(userId: string, progress: PlayerProgress): Promise<void> {
  const envelope: ProgressEnvelope = {
    userId,
    updatedAt: Date.now(),
    progress: {
      sceneId: progress.sceneId,
      phase: persistPhase(progress.phase),
      chat: persistPhase(progress.phase) === 'chat' ? progress.chat.slice(-40) : [],
      seenIntro: progress.seenIntro,
    },
  };
  writeCache(envelope);
  await writeRemote(envelope).catch(() => undefined);
}
