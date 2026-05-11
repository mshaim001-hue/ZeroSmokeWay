import { getSupabaseAdmin, hasSupabaseAdmin } from '../lib/supabaseServer.js';

/**
 * Сохраняет полную историю чата оркестратора (JSONB messages).
 * @param {string} userId
 * @param {Array<{ text: string, isUser: boolean, timestamp: string }>} messages
 */
export async function saveOrchestratorConversation(userId, messages) {
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

  const payload = { messages, updated_at: new Date().toISOString() };

  if (existing?.id) {
    const { error } = await admin.from('conversations').update(payload).eq('id', existing.id);
    if (error) console.warn('conversation update:', error.message);
  } else {
    const { error } = await admin.from('conversations').insert({
      user_id: userId,
      agent_type: 'orchestrator',
      messages,
    });
    if (error) console.warn('conversation insert:', error.message);
  }
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
