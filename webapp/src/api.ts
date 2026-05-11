export type ChatMessage = {
  text: string;
  isUser: boolean;
  timestamp: string;
};

const apiRoot = () => (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function postOrchestrator(body: {
  message: string;
  conversationHistory: ChatMessage[];
  anamnesisData: Record<string, unknown> | null;
  phase: string;
  userProfile: unknown;
  currentPlan: Record<string, unknown> | null;
}): Promise<{
  response: string;
  extractedData?: Record<string, unknown> | null;
  phase?: string | null;
  nextAgent?: string | null;
  plan?: Record<string, unknown> | null;
}> {
  const base = apiRoot();
  const res = await fetch(`${base}/api/orchestrator`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  return res.json() as Promise<{
    response: string;
    extractedData?: Record<string, unknown> | null;
    phase?: string | null;
    nextAgent?: string | null;
    plan?: Record<string, unknown> | null;
  }>;
}
