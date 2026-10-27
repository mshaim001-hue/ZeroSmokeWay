export type Stance = 'hold' | 'probe' | 'release' | 'advance';
export type SceneReply = { response: string; stance: Stance; next: 'stay' | 'advance' };
export type ChatLine = { role: 'user' | 'assistant'; content: string };

function asStance(value: unknown): Stance {
  return value === 'probe' || value === 'release' || value === 'advance' || value === 'hold' ? value : 'hold';
}

export async function askScene(sceneId: string, message: string, history: ChatLine[], signal: AbortSignal): Promise<SceneReply> {
  const root = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const bounded = history.length <= 20 ? history : [...history.slice(0, 3), ...history.slice(-17)];
  const response = await fetch(`${root}/api/scene`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sceneId,
      message: message.slice(0, 2000),
      history: bounded.map(({ role, content }) => ({ role, content: content.slice(0, 2000) })),
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
    next: value.next === 'advance' ? 'advance' : 'stay',
  };
}
