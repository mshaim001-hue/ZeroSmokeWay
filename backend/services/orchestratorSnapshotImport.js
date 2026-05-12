/**
 * Валидация тела PUT /api/orchestrator для переноса гостевого диалога в аккаунт после входа.
 */

export const ORCHESTRATOR_IMPORT_LIMITS = {
  maxMessages: 600,
  maxTextChars: 20000,
};

/**
 * @returns {{ ok: true, messages: Array<{text: string, isUser: boolean, timestamp: string}>, phase: string|null, plan: object|null, anamnesis: object|null } | { ok: false, status: number, error: string }}
 */
export function parseOrchestratorImportPayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'Invalid JSON body' };
  }

  const { messages: rawMsgs, orchestrator_state: rawState } = body;
  if (!Array.isArray(rawMsgs)) {
    return { ok: false, status: 400, error: 'messages must be an array' };
  }

  const { maxMessages, maxTextChars } = ORCHESTRATOR_IMPORT_LIMITS;
  if (rawMsgs.length > maxMessages || rawMsgs.length === 0) {
    return { ok: false, status: 400, error: 'messages empty or too long' };
  }

  /** @type {Array<{text: string, isUser: boolean, timestamp: string}>} */
  const messages = [];

  for (const m of rawMsgs) {
    if (!m || typeof m !== 'object') {
      return { ok: false, status: 400, error: 'invalid message shape' };
    }
    const { text, isUser, timestamp } = m;
    if (
      typeof text !== 'string' ||
      typeof isUser !== 'boolean' ||
      typeof timestamp !== 'string' ||
      text.length === 0 ||
      text.length > maxTextChars
    ) {
      return { ok: false, status: 400, error: 'invalid message shape' };
    }

    messages.push({ text, isUser, timestamp });
  }

  let phase = null;
  let plan = null;
  let anamnesis = null;

  if (rawState != null) {
    if (typeof rawState !== 'object' || Array.isArray(rawState)) {
      return { ok: false, status: 400, error: 'orchestrator_state must be an object' };
    }
    if (typeof rawState.phase === 'string') phase = rawState.phase;
    if ('plan' in rawState) {
      if (
        rawState.plan !== null &&
        (typeof rawState.plan !== 'object' || Array.isArray(rawState.plan))
      ) {
        return { ok: false, status: 400, error: 'invalid plan' };
      }
      plan = rawState.plan ?? null;
    }
    if ('anamnesis' in rawState) {
      if (
        rawState.anamnesis !== null &&
        (typeof rawState.anamnesis !== 'object' || Array.isArray(rawState.anamnesis))
      ) {
        return { ok: false, status: 400, error: 'invalid anamnesis' };
      }
      anamnesis = rawState.anamnesis ?? null;
    }
  }

  return { ok: true, messages, phase, plan, anamnesis };
}
