import { supabase } from '../auth/client';
import { applyQuitSnapshot } from '../auth/progress';
import type { PlayerProgress } from '../auth/progressModel';

function asError(error: { message?: string } | null, fallback: string): Error {
  return new Error(error?.message || fallback);
}

export async function declareIntent(userId: string): Promise<PlayerProgress> {
  const { data, error } = await supabase().rpc('declare_intent');
  if (error) throw asError(error, 'Could not save that intention.');
  return applyQuitSnapshot(userId, data);
}

export async function confirmLastCigarette(
  userId: string,
  at: Date,
  source: 'now' | 'entered',
): Promise<PlayerProgress> {
  const { data, error } = await supabase().rpc('confirm_last_cigarette', {
    p_at: at.toISOString(),
    p_source: source,
  });
  if (error) throw asError(error, 'Could not start the count.');
  return applyQuitSnapshot(userId, data);
}

export async function recordSmoked(
  userId: string,
  at: Date | null,
  restart: boolean,
): Promise<PlayerProgress> {
  const { data, error } = await supabase().rpc('record_smoked', {
    p_at: at ? at.toISOString() : null,
    p_restart: restart,
  });
  if (error) throw asError(error, 'Could not record that cigarette.');
  return applyQuitSnapshot(userId, data);
}

export async function saveSupportChat(userId: string, chat: PlayerProgress['supportChat']): Promise<PlayerProgress> {
  const { data, error } = await supabase().rpc('save_support_chat', { p_chat: chat });
  if (error) throw asError(error, 'Could not save this talk.');
  return applyQuitSnapshot(userId, data);
}
