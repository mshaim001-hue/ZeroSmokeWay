import { ROOMS, ROOM_ORDER } from './content.ts';

export type ChatLine = { role: 'user' | 'assistant'; content: string; mode?: 'ai' | 'authored' | 'offline' };
export type JourneyState = {
  version: 1;
  started: boolean;
  view: 'lobby' | 'room' | 'ending';
  roomId: string;
  stage: 'intro' | 'task' | 'steps' | 'reflection' | 'doors';
  stepIndex: number;
  completed: string[];
  inspected: string[];
  answers: Record<string, string[]>;
  notes: Record<string, string>;
  chats: Record<string, ChatLine[]>;
  initialReason: string;
  muted: boolean;
  volume: number;
  reducedMotion: boolean;
  updatedAt: string;
};
export const SAVE_KEY = 'zsw_labyrinth_v1';
export function newJourney(): JourneyState {
  return { version: 1, started: false, view: 'lobby', roomId: 'pleasure', stage: 'intro', stepIndex: 0, completed: [], inspected: [], answers: {}, notes: {}, chats: {}, initialReason: '', muted: false, volume: .35, reducedMotion: false, updatedAt: new Date().toISOString() };
}
const hasRoom = (value: unknown): value is string => typeof value === 'string' && ROOM_ORDER.includes(value);
const text = (value: unknown, limit = 2000) => typeof value === 'string' ? value.slice(0, limit) : '';

/** Treat saved JSON as untrusted and recover conservatively after schema changes. */
export function parseJourney(raw: string | null): JourneyState | null {
  if (!raw) return null;
  try {
    const input = JSON.parse(raw);
    if (!input || input.version !== 1 || typeof input.started !== 'boolean') return null;
    const fresh = newJourney();
    const ids = (value: unknown): string[] => Array.isArray(value) ? [...new Set(value.filter(hasRoom))] : [];
    const answers: JourneyState['answers'] = {};
    const notes: JourneyState['notes'] = {};
    const chats: JourneyState['chats'] = {};
    for (const id of ROOM_ORDER) {
      if (Array.isArray(input.answers?.[id])) answers[id] = input.answers[id].slice(0, 6).map((v: unknown) => text(v));
      if (typeof input.notes?.[id] === 'string') notes[id] = text(input.notes[id]);
      if (Array.isArray(input.chats?.[id])) chats[id] = input.chats[id].filter((line: ChatLine) => line && ['user', 'assistant'].includes(line.role) && typeof line.content === 'string').slice(-24).map((line: ChatLine) => ({ role: line.role, content: text(line.content), mode: ['ai', 'authored', 'offline'].includes(line.mode || '') ? line.mode : undefined }));
    }
    const completed = ids(input.completed);
    const roomId = hasRoom(input.roomId) ? input.roomId : fresh.roomId;
    const room = ROOMS.find(r => r.id === roomId)!;
    const stepIndex = Number.isInteger(input.stepIndex) ? Math.min(room.steps.length - 1, Math.max(0, input.stepIndex)) : 0;
    let view = ['lobby', 'room', 'ending'].includes(input.view) ? input.view as JourneyState['view'] : 'lobby';
    if (view === 'ending' && completed.length !== ROOM_ORDER.length) view = 'lobby';
    let stage = ['intro', 'task', 'steps', 'reflection', 'doors'].includes(input.stage) ? input.stage as JourneyState['stage'] : 'intro';
    if (stage === 'reflection' && !answers[roomId]?.[stepIndex]) stage = 'steps';
    if (stage === 'doors' && !completed.includes(roomId)) stage = 'intro';
    return { ...fresh, started: input.started, view, roomId, stage, stepIndex, completed, inspected: ids(input.inspected), answers, notes, chats, initialReason: text(input.initialReason), muted: Boolean(input.muted), volume: typeof input.volume === 'number' && Number.isFinite(input.volume) ? Math.min(1, Math.max(0, input.volume)) : .35, reducedMotion: Boolean(input.reducedMotion), updatedAt: text(input.updatedAt, 100) || fresh.updatedAt };
  } catch { return null; }
}
export function doorDestinations(completed: string[], currentId?: string): string[] {
  const pending = ROOM_ORDER.filter(id => id !== 'freedom' && id !== currentId && !completed.includes(id));
  if (pending.length) return pending.slice(0, 3);
  return completed.includes('freedom') || currentId === 'freedom' ? [] : ['freedom'];
}
export function exportJourney(state: JourneyState): string {
  const lines = ['ЛАБИРИНТ — мои записи', `Дата: ${new Date().toLocaleDateString('ru-RU')}`, '', `Моя причина: ${state.initialReason || 'Не записана'}`];
  for (const room of ROOMS) {
    if (!state.completed.includes(room.id)) continue;
    lines.push('', room.title, state.notes[room.id] || 'Без личной заметки');
    if (state.chats[room.id]?.length) {
      lines.push('Разговор за дверью:');
      state.chats[room.id].forEach(line => lines.push(`${line.role === 'user' ? 'Я' : 'Ведущий'}: ${line.content}`));
    } else room.steps.forEach((step, i) => lines.push(`${step.prompt}\n${state.answers[room.id]?.[i] || 'Не записано'}`));
  }
  return lines.join('\n');
}
