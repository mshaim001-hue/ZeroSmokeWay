import { newRoomProgress, type ChatLine, type RoomProgress } from './dialogueTypes';

export type GuideReply = { response: string; mode: 'ai' | 'authored'; progress: RoomProgress; issue?: string };
export const GUIDE_ISSUES: Record<string, string> = {
  missing_key: 'На сервере не настроен ключ AI.',
  auth_error: 'Сервер не получил доступ к AI. Проверь ключ и права проекта.',
  model_unavailable: 'Настроенная модель недоступна этому API-проекту.',
  invalid_request: 'Настройки запроса несовместимы с моделью.',
  rate_limit: 'Достигнут лимит запросов или бюджета AI.',
  timeout: 'AI не успел ответить. Можно повторить запрос.',
  provider_error: 'Сервис AI временно недоступен.',
  invalid_response: 'Ответ AI не удалось обработать.',
};
export async function askGuide(roomId: string, message: string, history: ChatLine[], discoveries: string[], signal: AbortSignal, personalReason?: string): Promise<GuideReply> {
  const root = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const context = history.length <= 20 ? history : history.filter((_,index) => index < 5 || index >= history.length - 15);
  const result = await fetch(`${root}/api/labyrinth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, message, personalReason, history: context.map(({ role, content }) => ({ role, content: content.slice(0,2000) })), discoveries: discoveries.filter(Boolean).slice(-12).map(d => d.slice(0, 200)) }), signal });
  if (!result.ok) throw new Error('Ответ сейчас недоступен');
  const json = await result.json();
  if (typeof json.response !== 'string' || !['ai', 'authored'].includes(json.mode) || !json.progress || !['explore','compare','reflect','ready'].includes(json.progress.phase)) throw new Error('Некорректный ответ AI');
  const progress = newRoomProgress();
  progress.phase = json.progress.phase;
  for (const key of ['episode','expectation','observation','conclusion'] as const) progress.evidence[key] = typeof json.progress.evidence?.[key] === 'string' ? json.progress.evidence[key].slice(0,500) : '';
  progress.ready = json.mode === 'ai' && json.progress.ready === true && Object.values(progress.evidence).every(Boolean);
  return { response: json.response.slice(0, 2000), mode: json.mode, progress, issue: typeof json.issue === 'string' && Object.hasOwn(GUIDE_ISSUES,json.issue) ? json.issue : undefined };
}
