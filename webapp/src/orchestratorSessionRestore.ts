import type { ChatMessage, OrchestratorStoredSession } from './api';

export function parseStoredOrchestratorSession(stored: OrchestratorStoredSession): {
  messages: ChatMessage[] | null;
  phase: string | null;
  plan: Record<string, unknown> | null;
  anamnesis: Record<string, unknown> | null;
} {
  const raw = stored.messages;
  if (!Array.isArray(raw) || raw.length === 0) {
    return { messages: null, phase: null, plan: null, anamnesis: null };
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
      return { messages: null, phase: null, plan: null, anamnesis: null };
    }
  }
  const st = stored.orchestrator_state ?? {};
  const phase = typeof st.phase === 'string' ? st.phase : null;
  const plan = st.plan && typeof st.plan === 'object' ? (st.plan as Record<string, unknown>) : null;
  const anamnesis =
    st.anamnesis && typeof st.anamnesis === 'object' ? (st.anamnesis as Record<string, unknown>) : null;
  return { messages, phase, plan, anamnesis };
}
