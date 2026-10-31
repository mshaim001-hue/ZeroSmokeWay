import { FIRST_SCENE, isSceneId, type Phase, type SceneId } from '../scenes/catalog.ts';
import type { ChatLine } from '../scenes/act1/api.ts';

export const PROGRESS_CACHE = 'zsw_progress_v2';

export type StoredPhase = 'idle' | 'chat';

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
  memory: MemoryEntry[];
};

export type ProgressEnvelope = {
  userId: string;
  updatedAt: number;
  progress: PlayerProgress;
};

export function newMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultProgress(): PlayerProgress {
  return { sceneId: FIRST_SCENE, phase: 'idle', chat: [], seenIntro: false, canAdvance: false, memory: [] };
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
    const rawId = (row as { id?: unknown }).id;
    const id = typeof rawId === 'string' && rawId.trim() ? rawId.trim().slice(0, 80) : newMessageId();
    lines.push({ id, role, content: content.slice(0, 2000) });
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
  const memory = parseMemory(row.memory);
  return { sceneId, phase, chat, seenIntro, canAdvance, memory };
}

export function parseEnvelope(raw: unknown, userId: string): ProgressEnvelope | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (row.userId !== userId) return null;
  const updatedAt = typeof row.updatedAt === 'number' ? row.updatedAt : Date.parse(String(row.updatedAt ?? ''));
  if (!Number.isFinite(updatedAt)) return null;
  return { userId, updatedAt, progress: parseProgress(row.progress ?? row) };
}

export function newerEnvelope(a: ProgressEnvelope | null, b: ProgressEnvelope | null): ProgressEnvelope | null {
  if (!a) return b;
  if (!b) return a;
  return a.updatedAt >= b.updatedAt ? a : b;
}
