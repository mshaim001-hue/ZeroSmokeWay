export type ChatMessage = {
  text: string;
  isUser: boolean;
  timestamp: string;
};

export type LilaState = {
  position: number;
  gameEntered: boolean;
  visitedCells: number[];
};

export type MythPlan = {
  title: string;
  sections: { title: string; content: string }[];
  pledgePrompt: string;
  generatedAt?: string;
};

export type MythProgress = {
  sectionIndex?: number;
  narrativeComplete?: boolean;
  pledgeReceived?: boolean;
  [key: string]: unknown;
};

const apiRoot = () => (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function postOrchestrator(
  body: {
    message: string;
    conversationHistory: ChatMessage[];
    anamnesisData: Record<string, unknown> | null;
    phase: string;
    userProfile: unknown;
    mythProgress?: MythProgress;
    lilaState?: LilaState | null;
    mythPlan?: MythPlan | null;
    pledgeText?: string | null;
  },
  accessToken: string | null,
): Promise<{
  response: string;
  extractedData?: Record<string, unknown> | null;
  phase?: string | null;
  session?: { isAuthenticated: boolean };
  anamnesisState?: Record<string, unknown> | null;
  coverageScore?: number;
  mythProgress?: MythProgress;
  mythPlan?: MythPlan | null;
  lilaState?: LilaState | null;
  pledgeText?: string | null;
  diceReady?: boolean;
  lilaPosition?: number | null;
  gameEntered?: boolean;
  awaitingPledge?: boolean;
  mythNarrativeActive?: boolean;
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
  return res.json();
}

export async function putOrchestratorGuestSnapshot(
  accessToken: string,
  snapshot: {
    messages: ChatMessage[];
    phase: string;
    anamnesis: Record<string, unknown> | null;
  },
): Promise<'saved' | 'exists'> {
  const base = apiRoot();
  if (!accessToken) {
    throw new Error('Токен не задан');
  }

  const res = await fetch(`${base}/api/orchestrator`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messages: snapshot.messages,
      orchestrator_state: {
        phase: snapshot.phase,
        anamnesis: snapshot.anamnesis,
      },
    }),
  });

  if (res.status === 204) return 'saved';
  if (res.status === 409) return 'exists';
  const t = await res.text();
  throw new Error(t || `HTTP ${res.status}`);
}

export type OrchestratorStoredSession = {
  messages: ChatMessage[] | unknown;
  orchestrator_state: {
    phase?: string | null;
    plan?: Record<string, unknown> | null;
    anamnesis?: Record<string, unknown> | null;
    mythProgress?: MythProgress | null;
    mythPlan?: MythPlan | null;
    lilaState?: LilaState | null;
    pledgeText?: string | null;
    sessionBrief?: string | null;
    diceReady?: boolean | null;
    lilaPosition?: number | null;
  };
};

export async function fetchOrchestratorSession(accessToken: string | null): Promise<OrchestratorStoredSession | null> {
  if (!accessToken) return null;
  const base = apiRoot();
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
