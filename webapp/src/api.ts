export type ChatMessage = {
  text: string;
  isUser: boolean;
  timestamp: string;
};

const apiRoot = () => (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function postOrchestrator(
  body: {
    message: string;
    conversationHistory: ChatMessage[];
    anamnesisData: Record<string, unknown> | null;
    phase: string;
    userProfile: unknown;
    currentPlan: Record<string, unknown> | null;
  },
  accessToken: string | null,
): Promise<{
  response: string;
  extractedData?: Record<string, unknown> | null;
  phase?: string | null;
  nextAgent?: string | null;
  plan?: Record<string, unknown> | null;
  session?: { isAuthenticated: boolean };
}> {
  const base = apiRoot();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${base}/api/orchestrator`, {
    method: 'POST',
    headers,
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
    session?: { isAuthenticated: boolean };
  }>;
}

export type OrchestratorStoredSession = {
  messages: ChatMessage[] | unknown;
  orchestrator_state: {
    phase?: string | null;
    plan?: Record<string, unknown> | null;
    anamnesis?: Record<string, unknown> | null;
    saved_at?: string;
  };
};

/** GET /api/orchestrator — восстановление сессии после входа (Supabase JWT). GET на Vercel: тот же путь. */
export async function fetchOrchestratorSession(accessToken: string | null): Promise<OrchestratorStoredSession | null> {
  const base = apiRoot();
  if (!base || !accessToken) return null;
  const res = await fetch(`${base}/api/orchestrator`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401) return null;
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  return res.json() as Promise<OrchestratorStoredSession>;
}
