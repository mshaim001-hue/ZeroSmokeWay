import type { MemoryEntry } from '../../auth/progressModel';

export type Stance = 'hold' | 'probe' | 'release' | 'advance';
export type NextState = 'stay' | 'offer' | 'launch';
export type SceneReply = {
  response: string;
  stance: Stance;
  next: NextState;
  memory: MemoryEntry[];
};
export type ChatLine = { id: string; role: 'user' | 'assistant'; content: string };

function asStance(value: unknown): Stance {
  return value === 'probe' || value === 'release' || value === 'advance' || value === 'hold' ? value : 'hold';
}

function asNext(value: unknown): NextState {
  if (value === 'launch') return 'launch';
  if (value === 'offer' || value === 'advance') return 'offer';
  return 'stay';
}

export async function askScene(
  sceneId: string,
  message: string,
  history: ChatLine[],
  signal: AbortSignal,
  extras: { memory: MemoryEntry[]; canAdvance: boolean },
): Promise<SceneReply> {
  const root = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const bounded = history.length <= 20 ? history : [...history.slice(0, 3), ...history.slice(-17)];
  const response = await fetch(`${root}/api/scene`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sceneId,
      message: message.slice(0, 2000),
      history: bounded.map(({ id, role, content }) => ({
        id,
        role,
        content: content.slice(0, 2000),
      })),
      memory: extras.memory.slice(-40),
      canAdvance: extras.canAdvance === true,
    }),
    signal,
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok || typeof value.response !== 'string' || !value.response.trim()) {
    throw new Error(typeof value.issue === 'string' ? value.issue : 'unavailable');
  }
  return {
    response: value.response.slice(0, 2000),
    stance: asStance(value.stance),
    next: asNext(value.next),
    memory: Array.isArray(value.memory) ? value.memory : extras.memory,
  };
}
