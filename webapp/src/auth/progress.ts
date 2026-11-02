import { supabase, isAuthConfigured } from './client';
import {
  PROGRESS_CACHE,
  defaultProgress,
  newerEnvelope,
  parseEnvelope,
  parseProgress,
  persistPhase,
  refuseSceneDowngrade,
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
    offerOpen: progress.offerOpen === true && progress.canAdvance === true,
    memory: progress.memory.slice(-40),
    appStage: progress.appStage === 'support' || progress.appStage === 'preparing_to_start' ? progress.appStage : 'journey',
    completionOffered: progress.completionOffered === true,
    intendedAt: progress.intendedAt,
    currentIntervalId: progress.currentIntervalId,
    smokingStatus: progress.smokingStatus,
    supportChat: progress.appStage === 'support' ? progress.supportChat.slice(-40) : [],
    intervals: progress.intervals.slice(0, 40),
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
  offer_open?: boolean;
  memory?: unknown;
  app_stage?: string;
  completion_offered?: boolean;
  intended_at?: string | null;
  current_interval_id?: string | null;
  smoking_status?: string | null;
  support_chat?: unknown;
  intervals?: unknown;
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
      offerOpen: data.offer_open,
      memory: data.memory,
      appStage: data.app_stage,
      completionOffered: data.completion_offered,
      intendedAt: data.intended_at,
      currentIntervalId: data.current_interval_id,
      smokingStatus: data.smoking_status,
      supportChat: data.support_chat,
      intervals: data.intervals,
    }),
  };
}

async function readRemote(userId: string): Promise<ProgressEnvelope | null> {
  if (!isAuthConfigured()) return null;
  const full = await supabase()
    .from('player_progress')
    .select('scene_id, phase, chat, seen_intro, can_advance, offer_open, memory, updated_at, app_stage, completion_offered, intended_at, current_interval_id, smoking_status, support_chat')
    .eq('user_id', userId)
    .maybeSingle();
  if (!full.error && full.data) {
    const intervals = await supabase()
      .from('abstinence_intervals')
      .select('id, started_at, ended_at, source')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });
    return asRemoteProgress({ ...full.data, intervals: intervals.data ?? [] }, userId);
  }
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
    offer_open: stored.offerOpen,
    memory: stored.memory,
    app_stage: stored.appStage,
    completion_offered: stored.completionOffered,
    intended_at: stored.intendedAt || null,
    current_interval_id: stored.currentIntervalId || null,
    smoking_status: stored.smokingStatus || null,
    support_chat: stored.supportChat,
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
  const local = readCache(userId);
  const next = local ? refuseSceneDowngrade(local.progress, progress) : progress;
  const envelope: ProgressEnvelope = {
    userId,
    updatedAt: Date.now(),
    progress: storedProgress(next),
  };
  writeCache(envelope);
  await writeRemote(envelope).catch(() => undefined);
}

export async function applyQuitSnapshot(userId: string, snapshot: unknown): Promise<PlayerProgress> {
  const progress = parseProgress(snapshot);
  const envelope: ProgressEnvelope = {
    userId,
    updatedAt: Date.now(),
    progress: storedProgress(progress),
  };
  writeCache(envelope);
  return envelope.progress;
}
