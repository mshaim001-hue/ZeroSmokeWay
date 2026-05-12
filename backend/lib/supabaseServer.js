import { createClient } from '@supabase/supabase-js';

/** Читаем env при вызове: скрипты успевают вызвать dotenv.config() до импорта этого модуля не помогает (ESM). */
function supabaseUrl() {
  return process.env.SUPABASE_URL;
}

function serviceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function anonOrPublishableKey() {
  return (
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function hasSupabaseAdmin() {
  return Boolean(supabaseUrl() && serviceRoleKey());
}

/** Достаточно для проверки JWT (anon / publishable). */
export function hasSupabaseAuth() {
  return Boolean(supabaseUrl() && anonOrPublishableKey());
}

export function getSupabaseAdmin() {
  const url = supabaseUrl();
  const key = serviceRoleKey();
  if (!url || !key) {
    throw new Error('SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY обязательны для операций с БД');
  }
  return createClient(url, key, {
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
  const url = supabaseUrl();
  const anonKey = anonOrPublishableKey();
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
