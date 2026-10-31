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

function storedProgress(progress: PlayerProgress): PlayerProgress {
  const phase = persistPhase(progress.phase);
  return {
    sceneId: progress.sceneId,
    phase,
    chat: phase === 'chat' ? progress.chat.slice(-40) : [],
    seenIntro: progress.seenIntro,
    canAdvance: progress.canAdvance === true,
    memory: progress.memory.slice(-40),
  };
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

function asRemoteProgress(data: {
  scene_id: string;
  phase: string;
  chat: unknown;
  seen_intro: boolean;
  updated_at: string;
  can_advance?: boolean;
  memory?: unknown;
}, userId: string): ProgressEnvelope {
  return {
    userId,
    updatedAt: Date.parse(data.updated_at) || 0,
    progress: parseProgress({
      sceneId: data.scene_id,
      phase: data.phase,
      chat: data.chat,
      seenIntro: data.seen_intro,
      canAdvance: data.can_advance,
      memory: data.memory,
    }),
  };
}

async function readRemote(userId: string): Promise<ProgressEnvelope | null> {
  if (!isAuthConfigured()) return null;
  const full = await supabase()
    .from('player_progress')
    .select('scene_id, phase, chat, seen_intro, can_advance, memory, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (!full.error && full.data) return asRemoteProgress(full.data, userId);
  const legacy = await supabase()
    .from('player_progress')
    .select('scene_id, phase, chat, seen_intro, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (legacy.error || !legacy.data) return null;
  return asRemoteProgress(legacy.data, userId);
}

async function writeRemote(envelope: ProgressEnvelope): Promise<void> {
  if (!isAuthConfigured()) return;
  const { progress, userId, updatedAt } = envelope;
  const stored = storedProgress(progress);
  const row = {
    user_id: userId,
    scene_id: stored.sceneId,
    phase: stored.phase,
    chat: stored.chat,
    seen_intro: stored.seenIntro,
    can_advance: stored.canAdvance,
    memory: stored.memory,
    updated_at: new Date(updatedAt).toISOString(),
  };
  const full = await supabase().from('player_progress').upsert(row);
  if (!full.error) return;
  const { error } = await supabase().from('player_progress').upsert({
    user_id: row.user_id,
    scene_id: row.scene_id,
    phase: row.phase,
    chat: row.chat,
    seen_intro: row.seen_intro,
    updated_at: row.updated_at,
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
    progress: storedProgress(progress),
  };
  writeCache(envelope);
  await writeRemote(envelope).catch(() => undefined);
}
