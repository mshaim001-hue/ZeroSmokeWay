import type { ChatLine } from './state';

export async function askGuide(roomId: string, message: string, history: ChatLine[], discoveries: string[], signal: AbortSignal): Promise<{ response: string; mode: 'ai' | 'authored' }> {
  const root = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const result = await fetch(`${root}/api/labyrinth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, message, history: history.slice(-20).map(({ role, content }) => ({ role, content })), discoveries: discoveries.filter(Boolean).slice(-12).map(d => d.slice(0, 200)) }), signal });
  if (!result.ok) throw new Error('Ведущий сейчас недоступен');
  const json = await result.json();
  if (typeof json.response !== 'string' || !['ai', 'authored'].includes(json.mode)) throw new Error('Некорректный ответ ведущего');
  return { response: json.response.slice(0, 2000), mode: json.mode };
}
