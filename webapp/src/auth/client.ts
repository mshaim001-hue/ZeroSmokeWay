import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function supabaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
}

function supabaseKey(): string {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();
}

export function isAuthConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseKey());
}

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!isAuthConfigured()) {
    throw new Error('Supabase is not configured');
  }
  if (!client) {
    client = createClient(supabaseUrl(), supabaseKey(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
  }
  return client;
}
