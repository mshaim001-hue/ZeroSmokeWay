import { getSupabaseAdmin, hasSupabaseAdmin } from '../lib/supabaseServer.js';

/**
 * Сохраняет полную историю чата оркестратора (JSONB messages) + снимок phase/plan/anamnesis.
 * @param {string} userId
 * @param {Array<{ text: string, isUser: boolean, timestamp: string }>} messages
 * @param {{ phase?: string, plan?: object|null, anamnesis?: object|null }} [orchestratorState]
 */
export async function saveOrchestratorConversation(userId, messages, orchestratorState = {}) {
  if (!userId || !hasSupabaseAdmin()) return;

  const admin = getSupabaseAdmin();
  const { data: existing, error: selErr } = await admin
    .from('conversations')
    .select('id')
    .eq('user_id', userId)
    .eq('agent_type', 'orchestrator')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selErr) {
    console.warn('conversation select:', selErr.message);
    return;
  }

  const payload = {
    messages,
    updated_at: new Date().toISOString(),
  };

  const { phase, plan, anamnesis } = orchestratorState || {};
  payload.orchestrator_state = {
    phase: phase ?? null,
    plan: plan ?? null,
    anamnesis: anamnesis ?? null,
    saved_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await admin.from('conversations').update(payload).eq('id', existing.id);
    if (error) console.warn('conversation update:', error.message);
  } else {
    const { error } = await admin.from('conversations').insert({
      user_id: userId,
      agent_type: 'orchestrator',
      messages,
      orchestrator_state: payload.orchestrator_state ?? {},
    });
    if (error) console.warn('conversation insert:', error.message);
  }
}

/**
 * Загрузить сохранённый оркестраторный диалог (для возобновления после входа).
 * @param {string} userId
 * @returns {Promise<{ messages: unknown, orchestrator_state: object }|null>}
 */
export async function getOrchestratorSession(userId) {
  if (!userId || !hasSupabaseAdmin()) return null;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('conversations')
    .select('messages, orchestrator_state')
    .eq('user_id', userId)
    .eq('agent_type', 'orchestrator')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('conversation get:', error.message);
    return null;
  }
  if (!data) return null;
  return {
    messages: data.messages,
    orchestrator_state: data.orchestrator_state && typeof data.orchestrator_state === 'object' ? data.orchestrator_state : {},
  };
}

/**
 * Прямой агент (не оркестратор): отдельная «ветка» по agent_type.
 */
export async function saveAgentConversation(userId, agentType, messages) {
  if (!userId || !hasSupabaseAdmin()) return;
  if (!['anamnesis', 'myth_buster', 'support'].includes(agentType)) return;

  const admin = getSupabaseAdmin();
  const { data: existing } = await admin
    .from('conversations')
    .select('id')
    .eq('user_id', userId)
    .eq('agent_type', agentType)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = { messages, updated_at: new Date().toISOString() };

  if (existing?.id) {
    await admin.from('conversations').update(payload).eq('id', existing.id);
  } else {
    await admin.from('conversations').insert({
      user_id: userId,
      agent_type: agentType,
      messages,
    });
  }
}
