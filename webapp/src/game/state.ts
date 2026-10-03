import { ROOMS, ROOM_ORDER } from './content.ts';

export type ChatLine = { role: 'user' | 'assistant'; content: string; mode?: 'ai' | 'authored' | 'offline'; issue?: string };
export type RoomProgress = {
  phase: 'explore' | 'compare' | 'reflect' | 'ready';
  evidence: { episode: string; expectation: string; observation: string; conclusion: string };
  ready: boolean;
  legacy?: boolean;
};
export const EMPTY_PROGRESS: RoomProgress = { phase: 'explore', evidence: { episode: '', expectation: '', observation: '', conclusion: '' }, ready: false };
export function newRoomProgress(): RoomProgress { return { ...EMPTY_PROGRESS, evidence: { ...EMPTY_PROGRESS.evidence } }; }
export type JourneyState = {
  version: 2; started: boolean; view: 'lobby' | 'room' | 'ending'; roomId: string;
  stage: 'conversation' | 'doors'; progress: Record<string, RoomProgress>;
  completed: string[]; notes: Record<string, string>; chats: Record<string, ChatLine[]>;
  initialReason: string; muted: boolean; volume: number; reducedMotion: boolean; updatedAt: string;
};
// Keep the key so existing installations migrate their saved journey in place.
export const SAVE_KEY = 'zsw_labyrinth_v1';
export function newJourney(): JourneyState {
  return { version: 2, started: false, view: 'lobby', roomId: 'pleasure', stage: 'conversation', progress: {}, completed: [], notes: {}, chats: {}, initialReason: '', muted: false, volume: .35, reducedMotion: false, updatedAt: new Date().toISOString() };
}
const ALL_IDS = ROOMS.map(room => room.id);
const hasRoom = (value: unknown): value is string => typeof value === 'string' && ALL_IDS.includes(value);
const text = (value: unknown) => typeof value === 'string' ? value : '';
const phases: RoomProgress['phase'][] = ['explore', 'compare', 'reflect', 'ready'];

const normalizeEvidence = (value: string) => value.toLocaleLowerCase('ru-RU').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
/** Ready is a dialogue claim, validated against actual user-authored evidence. */
export function canCompleteRoom(state: JourneyState, id: string): boolean {
  const progress = state.progress[id];
  if (!hasRoom(id) || state.completed.includes(id) || !progress?.ready || progress.legacy) return false;
  const turns = (state.chats[id] || []).filter(line => line.role === 'user').map(line => normalizeEvidence(line.content));
  const meaningful = [...new Set(turns.filter(turn => turn.length >= 15 && turn.split(' ').length >= 3))];
  if (meaningful.length < 3) return false;
  return Object.values(progress.evidence).every(value => {
    const evidence = normalizeEvidence(value);
    return evidence.length > 0 && turns.some(turn => turn.includes(evidence));
  });
}

/** Validate untrusted saves; migrate v1 without losing historical conversations or notes. */
export function parseJourney(raw: string | null): JourneyState | null {
  if (!raw) return null;
  try {
    const input = JSON.parse(raw);
    if (!input || ![1, 2].includes(input.version) || typeof input.started !== 'boolean') return null;
    const fresh = newJourney();
    const completed: string[] = Array.isArray(input.completed) ? [...new Set<string>(input.completed.filter(hasRoom))] : [];
    const notes: JourneyState['notes'] = {};
    const chats: JourneyState['chats'] = {};
    const progress: JourneyState['progress'] = {};
    for (const id of ALL_IDS) {
      if (typeof input.notes?.[id] === 'string') notes[id] = input.notes[id];
      if (Array.isArray(input.chats?.[id])) {
        chats[id] = input.chats[id].filter((line: ChatLine) => line && ['user', 'assistant'].includes(line.role) && typeof line.content === 'string').map((line: ChatLine) => ({ role: line.role, content: line.content, mode: ['ai', 'authored', 'offline'].includes(line.mode || '') ? line.mode : undefined, issue: typeof line.issue === 'string' ? line.issue : undefined }));
      }
      if (input.version === 1) {
        // Preserve any old authored answers in the archive as user transcript lines.
        if (Array.isArray(input.answers?.[id]) && !chats[id]?.length) {
          chats[id] = input.answers[id].filter((answer: unknown) => typeof answer === 'string' && answer.trim()).map((answer: string) => ({ role: 'user', content: answer, mode: 'authored' }));
        }
        if (completed.includes(id)) progress[id] = { ...newRoomProgress(), phase: 'ready', ready: true, legacy: true };
      } else if (input.progress?.[id] && typeof input.progress[id] === 'object') {
        const value = input.progress[id];
        progress[id] = { phase: phases.includes(value.phase) ? value.phase : 'explore', ready: value.ready === true, evidence: { episode: text(value.evidence?.episode), expectation: text(value.evidence?.expectation), observation: text(value.evidence?.observation), conclusion: text(value.evidence?.conclusion) }, ...(value.legacy === true ? { legacy: true } : {}) };
      }
    }
    const roomId = hasRoom(input.roomId) ? input.roomId : fresh.roomId;
    let view: JourneyState['view'] = ['lobby', 'room', 'ending'].includes(input.view) ? input.view : 'lobby';
    if (view === 'ending' && !ROOM_ORDER.every(id => completed.includes(id))) view = 'lobby';
    let stage: JourneyState['stage'] = input.stage === 'doors' ? 'doors' : 'conversation';
    if (completed.includes(roomId)) stage = 'doors';
    const validated = { ...fresh, progress, completed, chats };
    if (input.version === 2) {
      for (const id of ALL_IDS) {
        if (progress[id]?.ready && !completed.includes(id) && !canCompleteRoom(validated, id)) {
          progress[id].ready = false;
          if (progress[id].phase === 'ready') progress[id].phase = 'reflect';
        }
      }
    }
    if (stage === 'doors' && !completed.includes(roomId) && !canCompleteRoom(validated, roomId)) stage = 'conversation';
    return { ...fresh, started: input.started, view, roomId, stage, progress, completed, notes, chats, initialReason: text(input.initialReason), muted: Boolean(input.muted), volume: typeof input.volume === 'number' && Number.isFinite(input.volume) ? Math.min(1, Math.max(0, input.volume)) : .35, reducedMotion: Boolean(input.reducedMotion), updatedAt: text(input.updatedAt) || fresh.updatedAt };
  } catch { return null; }
}

/** All pending destinations, ordered by shortest path through already visited nodes. */
export function doorDestinations(completed: string[], currentId?: string): string[] {
  const pending = ROOM_ORDER.filter(id => id !== currentId && !completed.includes(id) && (id !== 'freedom' || ROOM_ORDER.filter(required => required !== 'freedom').every(required => completed.includes(required))));
  if (!currentId || !hasRoom(currentId)) return pending;
  const distance = new Map<string, number>([[currentId, 0]]);
  const queue = [currentId];
  while (queue.length) {
    const id = queue.shift()!;
    const room = ROOMS.find(value => value.id === id)!;
    for (const next of room.connections) {
      if (distance.has(next) || (next === 'freedom' && !pending.includes('freedom') && !completed.includes('freedom'))) continue;
      distance.set(next, distance.get(id)! + 1);
      // A pending room is a destination; don't pretend it has already been traversed.
      if (completed.includes(next) || next === 'personal') queue.push(next);
    }
  }
  return pending.sort((a, b) => (distance.get(a) ?? Infinity) - (distance.get(b) ?? Infinity) || ROOM_ORDER.indexOf(a) - ROOM_ORDER.indexOf(b));
}

export function exportJourney(state: JourneyState): string {
  const lines = ['ЛАБИРИНТ — мои записи', `Дата: ${new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty' })}`, '', `Моя причина: ${state.initialReason || 'Не записана'}`];
  for (const room of ROOMS) {
    if (!state.completed.includes(room.id) && !state.chats[room.id]?.length && !state.notes[room.id]) continue;
    lines.push('', room.title);
    if (state.progress[room.id]?.legacy) lines.push('Архив предыдущей версии');
    if (state.notes[room.id]) lines.push(state.notes[room.id]);
    state.chats[room.id]?.forEach(line => lines.push(`${line.role === 'user' ? 'Я' : 'Ведущий'}: ${line.content}`));
  }
  return lines.join('\n');
}
