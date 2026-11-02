import { FIRST_SCENE, isSceneId, type Phase, type SceneId } from '../scenes/catalog.ts';
import type { ChatLine } from '../scenes/act1/api.ts';

export const PROGRESS_CACHE = 'zsw_progress_v3';

export type StoredPhase = 'idle' | 'chat';
export type AppStage = 'journey' | 'preparing_to_start' | 'support';
export type SmokingStatus = 'abstaining' | 'smoking' | '';
export type IntervalSource = 'now' | 'entered';

export type AbstinenceInterval = {
  id: string;
  startedAt: string;
  endedAt: string;
  source: IntervalSource;
};

export type MemorySource = 'player' | 'muse_hypothesis';
export type MemoryStatus = 'current' | 'revised' | 'disagreed';
export type MemoryDepth = 'mentioned' | 'partial' | 'thorough';

export type MemoryEntry = {
  id: string;
  theme: string;
  sceneId: string;
  quote: string;
  turnRef: string;
  context: string;
  source: MemorySource;
  status: MemoryStatus;
  revises: string;
  depth: MemoryDepth;
  summary: string;
  openQuestion: string;
};

export type PlayerProgress = {
  sceneId: SceneId;
  phase: StoredPhase;
  chat: ChatLine[];
  seenIntro: boolean;
  canAdvance: boolean;
  offerOpen: boolean;
  memory: MemoryEntry[];
  appStage: AppStage;
  completionOffered: boolean;
  intendedAt: string;
  currentIntervalId: string;
  smokingStatus: SmokingStatus;
  supportChat: ChatLine[];
  intervals: AbstinenceInterval[];
};

export type ProgressEnvelope = {
  userId: string;
  updatedAt: number;
  progress: PlayerProgress;
  schemaComplete?: boolean;
};

export function newMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultProgress(): PlayerProgress {
  return {
    sceneId: FIRST_SCENE,
    phase: 'idle',
    chat: [],
    seenIntro: false,
    canAdvance: false,
    offerOpen: false,
    memory: [],
    appStage: 'journey',
    completionOffered: false,
    intendedAt: '',
    currentIntervalId: '',
    smokingStatus: '',
    supportChat: [],
    intervals: [],
  };
}

export function parseStage(value: unknown): AppStage {
  return value === 'preparing_to_start' || value === 'support' ? value : 'journey';
}

export function parseSmokingStatus(value: unknown): SmokingStatus {
  return value === 'abstaining' || value === 'smoking' ? value : '';
}

export function parseIntervals(value: unknown): AbstinenceInterval[] {
  if (!Array.isArray(value)) return [];
  const rows: AbstinenceInterval[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, unknown>;
    const id = typeof item.id === 'string' ? item.id : '';
    const startedAt = typeof item.startedAt === 'string' ? item.startedAt : typeof item.started_at === 'string' ? item.started_at : '';
    if (!startedAt) continue;
    const endedRaw = item.endedAt ?? item.ended_at;
    rows.push({
      id: id || startedAt,
      startedAt,
      endedAt: typeof endedRaw === 'string' ? endedRaw : '',
      source: item.source === 'entered' ? 'entered' : 'now',
    });
  }
  return rows.slice(0, 40);
}

export function currentOpenInterval(progress: PlayerProgress): AbstinenceInterval | null {
  if (progress.appStage !== 'support' || progress.smokingStatus === 'smoking') return null;
  return progress.intervals.find(item => !item.endedAt) ?? null;
}

export function refuseSceneDowngrade(current: PlayerProgress, incoming: PlayerProgress): PlayerProgress {
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
    intervals: current.intervals.length ? current.intervals : incoming.intervals,
    supportChat: incoming.supportChat.length ? incoming.supportChat : current.supportChat,
    memory: incoming.memory.length ? incoming.memory : current.memory,
  };
}

export function looksLikeServiceJson(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) return false;
  return /"(reply|response|stance|next|memory|memory_updates|assessment)"\s*:/.test(trimmed);
}

export function playerFacingReply(content: string): string {
  const text = content.trim();
  if (!text) return '';
  if (!looksLikeServiceJson(text)) return text;
  try {
    const parsed = JSON.parse(text) as { reply?: unknown; response?: unknown };
    const reply = parsed.reply ?? parsed.response;
    if (typeof reply === 'string' && reply.trim()) return reply.trim();
  } catch {
    /* truncated or invalid */
  }
  return '';
}

export function persistPhase(phase: Phase | string): StoredPhase {
  return phase === 'chat' ? 'chat' : 'idle';
}

export function parseChat(value: unknown): ChatLine[] {
  if (!Array.isArray(value)) return [];
  const lines: ChatLine[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object') continue;
    const role = (row as { role?: unknown }).role;
    const content = (row as { content?: unknown }).content;
    if (role !== 'user' && role !== 'assistant') continue;
    if (typeof content !== 'string' || !content.trim()) continue;
    const visible = role === 'assistant' ? playerFacingReply(content) : content.trim();
    if (!visible) continue;
    const rawId = (row as { id?: unknown }).id;
    const id = typeof rawId === 'string' && rawId.trim() ? rawId.trim().slice(0, 80) : newMessageId();
    lines.push({ id, role, content: visible.slice(0, 2000) });
  }
  return lines.slice(-40);
}

function asSource(value: unknown): MemorySource {
  return value === 'muse_hypothesis' ? value : 'player';
}

function asStatus(value: unknown): MemoryStatus {
  return value === 'revised' || value === 'disagreed' ? value : 'current';
}

function asDepth(value: unknown): MemoryDepth {
  return value === 'partial' || value === 'thorough' ? value : 'mentioned';
}

export function parseMemory(value: unknown): MemoryEntry[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const entries: MemoryEntry[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, unknown>;
    const summary = typeof item.summary === 'string' ? item.summary.trim() : '';
    const quote = typeof item.quote === 'string' ? item.quote.trim() : '';
    const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim().slice(0, 80) : '';
    if (!id && !summary && !quote) continue;
    const entry: MemoryEntry = {
      id: id || newMessageId(),
      theme: typeof item.theme === 'string' ? item.theme.trim().slice(0, 80) : '',
      sceneId: typeof item.sceneId === 'string' ? item.sceneId.trim().slice(0, 40) : '',
      quote: quote.slice(0, 400),
      turnRef: typeof item.turnRef === 'string' ? item.turnRef.trim().slice(0, 80) : '',
      context: typeof item.context === 'string' ? item.context.trim().slice(0, 120) : '',
      source: asSource(item.source),
      status: asStatus(item.status),
      revises: typeof item.revises === 'string' ? item.revises.trim().slice(0, 80) : '',
      depth: asDepth(item.depth),
      summary: (summary || quote).slice(0, 300),
      openQuestion: typeof item.openQuestion === 'string'
        ? item.openQuestion.trim().slice(0, 300)
        : typeof item.open_question === 'string' ? item.open_question.trim().slice(0, 300) : '',
    };
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    entries.push(entry);
    if (entries.length >= 40) break;
  }
  return entries;
}

export function parseProgress(raw: unknown): PlayerProgress {
  const empty = defaultProgress();
  if (!raw || typeof raw !== 'object') return empty;
  const row = raw as Record<string, unknown>;
  const sceneValue = typeof row.sceneId === 'string' ? row.sceneId : typeof row.scene_id === 'string' ? row.scene_id : '';
  const sceneId = isSceneId(sceneValue) ? sceneValue : FIRST_SCENE;
  const phase = persistPhase(typeof row.phase === 'string' ? row.phase : 'idle');
  const chat = phase === 'chat' ? parseChat(row.chat) : [];
  const seenIntro = row.seenIntro === true || row.seen_intro === true;
  const canAdvance = row.canAdvance === true || row.can_advance === true;
  const offerOpen = (row.offerOpen === true || row.offer_open === true) && canAdvance;
  const memory = parseMemory(row.memory);
  const appStage = parseStage(row.appStage ?? row.app_stage);
  const supportChat = appStage === 'support' ? parseChat(row.supportChat ?? row.support_chat) : [];
  return {
    sceneId,
    phase,
    chat,
    seenIntro,
    canAdvance,
    offerOpen,
    memory,
    appStage,
    completionOffered: row.completionOffered === true || row.completion_offered === true,
    intendedAt: typeof row.intendedAt === 'string' ? row.intendedAt : typeof row.intended_at === 'string' ? row.intended_at : '',
    currentIntervalId: typeof row.currentIntervalId === 'string' ? row.currentIntervalId : typeof row.current_interval_id === 'string' ? row.current_interval_id : '',
    smokingStatus: parseSmokingStatus(row.smokingStatus ?? row.smoking_status),
    supportChat,
    intervals: parseIntervals(row.intervals),
  };
}

export function isLifecycleSnapshot(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const row = raw as Record<string, unknown>;
  const stage = row.app_stage ?? row.appStage;
  return stage === 'support' || stage === 'preparing_to_start' || Array.isArray(row.intervals);
}

export function parseEnvelope(raw: unknown, userId: string): ProgressEnvelope | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (row.userId !== userId) return null;
  const updatedAt = typeof row.updatedAt === 'number' ? row.updatedAt : Date.parse(String(row.updatedAt ?? ''));
  if (!Number.isFinite(updatedAt)) return null;
  return {
    userId,
    updatedAt,
    progress: parseProgress(row.progress ?? row),
    schemaComplete: row.schemaComplete === false ? false : true,
  };
}

export function newerEnvelope(a: ProgressEnvelope | null, b: ProgressEnvelope | null): ProgressEnvelope | null {
  if (!a) return b;
  if (!b) return a;
  return a.updatedAt >= b.updatedAt ? a : b;
}

export function applyLifecycle(current: PlayerProgress, snapshot: PlayerProgress): PlayerProgress {
  return {
    ...current,
    appStage: snapshot.appStage,
    smokingStatus: snapshot.smokingStatus,
    intervals: snapshot.intervals,
    currentIntervalId: snapshot.currentIntervalId,
    intendedAt: snapshot.intendedAt,
    completionOffered: snapshot.completionOffered,
    sceneId: snapshot.appStage === 'support' ? snapshot.sceneId : current.sceneId,
    canAdvance: snapshot.appStage === 'support' ? false : current.canAdvance,
    offerOpen: snapshot.appStage === 'support' ? false : current.offerOpen,
  };
}

export function mergeSupportSnapshot(
  current: PlayerProgress,
  incoming: PlayerProgress,
  options: { preserveChat?: boolean } = {},
): PlayerProgress {
  const next = applyLifecycle(current, incoming);
  if (options.preserveChat) {
    return { ...next, supportChat: current.supportChat, memory: current.memory };
  }
  return {
    ...next,
    supportChat: incoming.supportChat.length ? incoming.supportChat : current.supportChat,
    memory: incoming.memory.length ? incoming.memory : current.memory,
  };
}

export function mergeEnvelopes(local: ProgressEnvelope | null, remote: ProgressEnvelope | null): ProgressEnvelope | null {
  if (!remote) return local;
  if (!local) return remote;
  if (remote.schemaComplete === false) {
    if (lpHasLifecycle(local.progress)) {
      return { ...local, updatedAt: Math.max(local.updatedAt, remote.updatedAt) };
    }
    return newerEnvelope(local, remote);
  }
  const rp = remote.progress;
  const lp = local.progress;
  const localNewer = local.updatedAt > remote.updatedAt;
  const sameStage = lp.appStage === rp.appStage;
  const chatFromLocal = localNewer && sameStage;
  const progress: PlayerProgress = {
    ...(chatFromLocal ? lp : rp),
    appStage: rp.appStage,
    smokingStatus: rp.smokingStatus,
    intervals: rp.intervals,
    currentIntervalId: rp.currentIntervalId,
    intendedAt: rp.intendedAt,
    completionOffered: rp.completionOffered || lp.completionOffered,
  };
  if (rp.appStage === 'support') {
    progress.sceneId = rp.sceneId;
    progress.phase = rp.phase;
    progress.chat = rp.chat;
    progress.canAdvance = false;
    progress.offerOpen = false;
    progress.supportChat = chatFromLocal ? lp.supportChat : rp.supportChat;
    progress.memory = chatFromLocal ? lp.memory : rp.memory;
  }
  return {
    userId: remote.userId,
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
    progress,
    schemaComplete: true,
  };
}

function lpHasLifecycle(progress: PlayerProgress): boolean {
  return progress.appStage === 'support' || progress.appStage === 'preparing_to_start' || progress.intervals.length > 0;
}
