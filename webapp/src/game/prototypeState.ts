export type PrototypeRoom = 'stress' | 'ritual' | 'loop';
export type Episode = { events: string[]; moment: string; expectation: string; observation: string };
export type Message = { role: 'user' | 'assistant'; content: string; mode?: 'ai' | 'authored' | 'offline' };
export type PrototypeState = {
  version: 1; initialReason: string; view: 'home' | 'doors' | 'room' | 'ending'; room: PrototypeRoom;
  episode: Episode; second: Episode; components: string[]; keep: string[]; hypothesis: string;
  comparison: string; interpretation: string; revisions: string[]; questions: string[];
  discoveries: PrototypeRoom[]; chats: Record<PrototypeRoom, Message[]>; muted: boolean;
};
export const PROTOTYPE_KEY = 'zsw_three_rooms_v1';
const emptyEpisode = (): Episode => ({ events: [], moment: '', expectation: '', observation: '' });
export function newPrototype(): PrototypeState {
  return { version: 1, initialReason: '', view: 'home', room: 'stress', episode: emptyEpisode(), second: emptyEpisode(), components: [], keep: [], hypothesis: '', comparison: '', interpretation: '', revisions: [], questions: [], discoveries: [], chats: { stress: [], ritual: [], loop: [] }, muted: false };
}
const text = (v: unknown): string => typeof v === 'string' ? v.slice(0, 2000) : '';
const texts = (v: unknown): string[] => Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, 30).map(x => text(x)) : [];
const readEpisode = (v: unknown): Episode => {
  const e = v && typeof v === 'object' ? v as Record<string, unknown> : {};
  return { events: texts(e.events), moment: text(e.moment), expectation: text(e.expectation), observation: text(e.observation) };
};
export function parsePrototype(raw: string | null): PrototypeState {
  const fresh = newPrototype();
  try {
    const v = JSON.parse(raw || 'null');
    if (!v || v.version !== 1) return fresh;
    const rooms = ['stress', 'ritual', 'loop'];
    const chats = { ...fresh.chats };
    for (const room of rooms as PrototypeRoom[]) {
      chats[room] = Array.isArray(v.chats?.[room]) ? v.chats[room].filter((m: Message) => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string').slice(-100).map((m: Message) => ({ role: m.role, content: text(m.content), mode: ['ai','authored','offline'].includes(m.mode || '') ? m.mode : undefined })) : [];
    }
    return { ...fresh, initialReason: text(v.initialReason), view: ['home','doors','room','ending'].includes(v.view) ? v.view : 'home', room: rooms.includes(v.room) ? v.room : 'stress', episode: readEpisode(v.episode), second: readEpisode(v.second), components: texts(v.components), keep: texts(v.keep), hypothesis: text(v.hypothesis), comparison: text(v.comparison), interpretation: text(v.interpretation), revisions: texts(v.revisions), questions: texts(v.questions), discoveries: [...new Set(texts(v.discoveries).filter(r => rooms.includes(r)))] as PrototypeRoom[], chats, muted: v.muted === true };
  } catch { return fresh; }
}
export function canDiscover(s: PrototypeState, room: PrototypeRoom): boolean {
  if (room === 'stress') return s.episode.events.some(e => e.trim()) && Boolean(s.episode.moment.trim() && s.episode.expectation.trim() && s.episode.observation.trim());
  if (room === 'ritual') return s.discoveries.includes('stress') && s.components.some(c => c.trim()) && Boolean(s.hypothesis.trim());
  return s.discoveries.includes('stress') && Boolean(s.comparison.trim() && s.interpretation.trim()) && (s.second.events.some(e => e.trim()) || s.comparison === 'Не могу сравнить');
}
export function discover(s: PrototypeState, room: PrototypeRoom): PrototypeState {
  if (!canDiscover(s, room)) return s;
  const revisions = room === 'loop' && s.interpretation !== s.revisions.at(-1) ? [...s.revisions, s.interpretation].slice(-30) : s.revisions;
  return { ...s, discoveries: [...s.discoveries.filter(id => id !== room), room], revisions, view: 'doors' };
}
export function opening(s: PrototypeState, room: PrototypeRoom): string {
  if (room === 'stress') return s.discoveries.includes('stress') ? `В тот раз было так: «${s.episode.events.join(' → ')}». Ты всё ещё думаешь об этом так же?` : s.initialReason === 'Мне нравится' ? 'Ты выбрал «Мне нравится». Вспомни один приятный перекур. Что тебе в нём понравилось?' : s.initialReason === 'Помогает расслабиться' ? 'Ты выбрал «Помогает расслабиться». Вспомни, когда сигарета помогла тебе расслабиться. Что было перед этим?' : s.initialReason ? `Ты написал: «${s.initialReason}». Вспомни перекур, в котором это особенно чувствовалось. Как всё было?` : 'Вспомни один недавний перекур. Почему ты закурил именно тогда?' ;
  if (room === 'ritual') return `Ты отметил: «${s.episode.moment}». Что ещё было в этом перекуре, кроме сигареты?`;
  return `В тот раз было так: «${s.episode.events.join(' → ')}». Вспомни ещё один перекур. Что там было иначе?`;
}
export function context(s: PrototypeState): string[] {
  return [
    `Эпизод игрока: ${s.episode.events.join(' → ')}. Отмеченный момент: ${s.episode.moment}. Ожидание: ${s.episode.expectation}. Наблюдение: ${s.episode.observation}.`,
    `Состав: ${s.components.join(', ')}. Хочет сохранить: ${s.keep.join(', ')}. Предположение, не факт: ${s.hypothesis}.`,
    `Второй случай: ${s.second.events.join(' → ')}. Сравнение: ${s.comparison}. Текущая версия игрока: ${s.interpretation}.`,
  ];
}
export function exportPrototype(s: PrototypeState): string {
  return ['ЛАБИРИНТ · МОЯ ИСТОРИЯ', ...context(s), `Предыдущие версии:\n${s.revisions.join('\n')}`, `Открытые вопросы:\n${s.questions.join('\n')}`, ...(['stress','ritual','loop'] as PrototypeRoom[]).map(r => `\n${r.toUpperCase()}\n${s.chats[r].map(m => `${m.role === 'user' ? 'Я' : `Ведущий (${m.mode || 'authored'})`}: ${m.content}`).join('\n')}`)].join('\n\n');
}
