import { FIRST_SCENE, isSceneId, type Phase, type SceneId } from '../scenes/catalog.ts';
import type { ChatLine } from '../scenes/act1/api.ts';

export const PROGRESS_CACHE = 'zsw_progress_v1';

export type StoredPhase = 'idle' | 'chat';

export type PlayerProgress = {
  sceneId: SceneId;
  phase: StoredPhase;
  chat: ChatLine[];
  seenIntro: boolean;
};

export type ProgressEnvelope = {
  userId: string;
  updatedAt: number;
  progress: PlayerProgress;
};

export function defaultProgress(): PlayerProgress {
  return { sceneId: FIRST_SCENE, phase: 'idle', chat: [], seenIntro: false };
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
    lines.push({ role, content: content.slice(0, 2000) });
  }
  return lines.slice(-40);
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
  return { sceneId, phase, chat, seenIntro };
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
