export type ChatLine = { role: 'user' | 'assistant'; content: string; mode?: 'ai' | 'authored' | 'offline'; issue?: string };
export type RoomProgress = { phase: 'explore' | 'compare' | 'reflect' | 'ready'; evidence: { episode: string; expectation: string; observation: string; conclusion: string }; ready: boolean };
export function newRoomProgress(): RoomProgress {
  return { phase: 'explore', evidence: { episode: '', expectation: '', observation: '', conclusion: '' }, ready: false };
}
