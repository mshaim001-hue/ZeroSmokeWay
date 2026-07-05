import type { ChatMessage, LilaState, MythPlan, MythProgress, OrchestratorStoredSession } from './api';

export function parseStoredOrchestratorSession(stored: OrchestratorStoredSession): {
  messages: ChatMessage[] | null;
  phase: string | null;
  plan: Record<string, unknown> | null;
  anamnesis: Record<string, unknown> | null;
  mythProgress: MythProgress | null;
  mythPlan: MythPlan | null;
  lilaState: LilaState | null;
  pledgeText: string | null;
  sessionBrief: string | null;
  diceReady: boolean;
  lilaPosition: number | null;
} {
  const empty = {
    messages: null,
    phase: null,
    plan: null,
    anamnesis: null,
    mythProgress: null,
    mythPlan: null,
    lilaState: null,
    pledgeText: null,
    sessionBrief: null,
    diceReady: false,
    lilaPosition: null,
  };
  const raw = stored.messages;
  if (!Array.isArray(raw) || raw.length === 0) {
    return empty;
  }
  const messages: ChatMessage[] = [];
  for (const m of raw) {
    if (
      m &&
      typeof m === 'object' &&
      typeof (m as ChatMessage).text === 'string' &&
      typeof (m as ChatMessage).isUser === 'boolean' &&
      typeof (m as ChatMessage).timestamp === 'string'
    ) {
      messages.push({
        text: (m as ChatMessage).text,
        isUser: (m as ChatMessage).isUser,
        timestamp: (m as ChatMessage).timestamp,
      });
    } else {
      return empty;
    }
  }
  const st = stored.orchestrator_state ?? {};
  return {
    messages,
    phase: typeof st.phase === 'string' ? st.phase : null,
    plan: st.plan && typeof st.plan === 'object' ? (st.plan as Record<string, unknown>) : null,
    anamnesis: st.anamnesis && typeof st.anamnesis === 'object' ? (st.anamnesis as Record<string, unknown>) : null,
    mythProgress: st.mythProgress && typeof st.mythProgress === 'object' ? (st.mythProgress as MythProgress) : null,
    mythPlan: st.mythPlan && typeof st.mythPlan === 'object' ? (st.mythPlan as MythPlan) : null,
    lilaState: st.lilaState && typeof st.lilaState === 'object' ? (st.lilaState as LilaState) : null,
    pledgeText: typeof st.pledgeText === 'string' ? st.pledgeText : null,
    sessionBrief: typeof st.sessionBrief === 'string' ? st.sessionBrief : null,
    diceReady: st.diceReady === true,
    lilaPosition: typeof st.lilaPosition === 'number' ? st.lilaPosition : null,
  };
}
