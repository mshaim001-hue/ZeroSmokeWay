import { authHeaders } from '../auth/client';
import type { MemoryEntry } from '../auth/progressModel';
import type { ChatLine } from '../scenes/act1/api';

export type SupportReply = {
  response: string;
  memory: MemoryEntry[];
  recordSmoked: boolean;
};

export async function askSupport(
  message: string,
  history: ChatLine[],
  signal: AbortSignal,
  extras: { memory: MemoryEntry[]; smokingStatus: string },
): Promise<SupportReply> {
  const root = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const bounded = history.length <= 20 ? history : [...history.slice(0, 3), ...history.slice(-17)];
  const response = await fetch(`${root}/api/support`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({
      message: message.slice(0, 2000),
      history: bounded.map(({ id, role, content }) => ({
        id,
        role,
        content: content.slice(0, 2000),
      })),
      memory: extras.memory.slice(-40),
    }),
    signal,
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok || typeof value.response !== 'string' || !value.response.trim()) {
    throw new Error(typeof value.issue === 'string' ? value.issue : 'unavailable');
  }
  return {
    response: value.response.slice(0, 2000),
    memory: Array.isArray(value.memory) ? value.memory : extras.memory,
    recordSmoked: value.recordSmoked === true,
  };
}
