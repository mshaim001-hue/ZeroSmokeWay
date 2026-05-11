import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function hasSupabaseAdmin() {
  return Boolean(url && serviceKey);
}

/** Достаточно для проверки JWT (anon / publishable). */
export function hasSupabaseAuth() {
  return Boolean(url && anonKey);
}

export function getSupabaseAdmin() {
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY обязательны для операций с БД');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Проверка JWT из заголовка Authorization (anon key).
 * @returns {Promise<string|null>} user id или null
 */
export async function getUserIdFromAuthHeader(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const jwt = authHeader.slice(7).trim();
  if (!jwt || !hasSupabaseAuth()) return null;
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(jwt);
  if (error || !user) return null;
  return user.id;
}
