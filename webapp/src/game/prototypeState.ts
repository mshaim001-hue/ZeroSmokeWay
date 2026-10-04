export type PrototypeRoom = 'stress' | 'ritual' | 'loop';
export type Episode = { events: string[]; moment: string; expectation: string; observation: string };
export type Message = { role: 'user' | 'assistant'; content: string; mode?: 'ai' | 'authored' | 'offline' };
export type PrototypeState = {
  version: 1; initialReason: string; firstThought: string; view: 'home' | 'doors' | 'room' | 'ending'; room: PrototypeRoom;
  episode: Episode; second: Episode; components: string[]; keep: string[]; hypothesis: string;
  comparison: string; interpretation: string; revisions: string[]; questions: string[];
  discoveries: PrototypeRoom[]; chats: Record<PrototypeRoom, Message[]>; muted: boolean;
};
export const PROTOTYPE_KEY = 'zsw_three_rooms_v1';
const emptyEpisode = (): Episode => ({ events: [], moment: '', expectation: '', observation: '' });
export function newPrototype(): PrototypeState {
  return { version: 1, initialReason: '', firstThought: '', view: 'home', room: 'stress', episode: emptyEpisode(), second: emptyEpisode(), components: [], keep: [], hypothesis: '', comparison: '', interpretation: '', revisions: [], questions: [], discoveries: [], chats: { stress: [], ritual: [], loop: [] }, muted: false };
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
    if (chats.stress.length && !chats.stress.some(m => m.role === 'user') && !texts(v.discoveries).includes('stress')) {
      chats.stress = [{ role: 'assistant', mode: 'authored', content: opening({ ...fresh, initialReason: text(v.initialReason) }, 'stress') }];
    }
    return { ...fresh, initialReason: text(v.initialReason), firstThought: text(v.firstThought), view: ['home','doors','room','ending'].includes(v.view) ? v.view : 'home', room: rooms.includes(v.room) ? v.room : 'stress', episode: readEpisode(v.episode), second: readEpisode(v.second), components: texts(v.components), keep: texts(v.keep), hypothesis: text(v.hypothesis), comparison: text(v.comparison), interpretation: text(v.interpretation), revisions: texts(v.revisions), questions: texts(v.questions), discoveries: [...new Set(texts(v.discoveries).filter(r => rooms.includes(r)))] as PrototypeRoom[], chats, muted: v.muted === true };
  } catch { return fresh; }
}
export function canDiscover(s: PrototypeState, room: PrototypeRoom): boolean {
  if (room === 'stress' && s.firstThought.trim()) {
    const turns = new Set(s.chats.stress.filter(m => m.role === 'user' && m.content.trim().length >= 15).map(m => m.content.trim()));
    return turns.size >= 3 || s.chats.stress.some(m => m.mode === 'offline');
  }
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
  if (room === 'stress') {
    if (s.discoveries.includes('stress')) return `Ты написал: «${s.firstThought || s.episode.observation}». Что ты сейчас об этом думаешь?`;
    if (['Сигарету с кофе или после еды', 'Мне нравится'].includes(s.initialReason)) return 'Что тебе нравится в сигарете с кофе или после еды?';
    if (['Возможность успокоиться', 'Помогает расслабиться'].includes(s.initialReason)) return 'Как ты замечаешь, что сигарета помогла тебе успокоиться?';
    if (s.initialReason === 'Не знаю. Я просто курю') return 'Чаще замечаешь, что хочется курить, или уже находишь себя с сигаретой?';
    return s.initialReason ? `Ты написал: «${s.initialReason}». Чего тебе будет не хватать без сигареты?` : 'Если перестать курить, по чему ты будешь скучать?';
  }
  if (room === 'ritual') return `Ты написал: «${s.firstThought || s.episode.moment}». Что в этом важно для тебя, кроме самой сигареты?`;
  return `Ты написал: «${s.firstThought || s.episode.observation}». Бывает ли с сигаретой по-другому?`;

}
export function context(s: PrototypeState): string[] {
  return [
    `Причина игрока: ${s.initialReason}. После первого разговора: ${s.firstThought}.`,
    `Эпизод игрока: ${s.episode.events.join(' → ')}. Отмеченный момент: ${s.episode.moment}. Ожидание: ${s.episode.expectation}. Наблюдение: ${s.episode.observation}.`,
    `Состав: ${s.components.join(', ')}. Хочет сохранить: ${s.keep.join(', ')}. Предположение, не факт: ${s.hypothesis}.`,
    `Второй случай: ${s.second.events.join(' → ')}. Сравнение: ${s.comparison}. Текущая версия игрока: ${s.interpretation}.`,
  ];
}
export function exportPrototype(s: PrototypeState): string {
  return ['ЛАБИРИНТ · МОЯ ИСТОРИЯ', ...context(s), `Предыдущие версии:\n${s.revisions.join('\n')}`, `Открытые вопросы:\n${s.questions.join('\n')}`, ...(['stress','ritual','loop'] as PrototypeRoom[]).map(r => `\n${r.toUpperCase()}\n${s.chats[r].map(m => `${m.role === 'user' ? 'Я' : `Ответ (${m.mode || 'authored'})`}: ${m.content}`).join('\n')}`)].join('\n\n');
}
