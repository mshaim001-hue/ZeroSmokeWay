/// <reference types="vite/client" />

declare const __GUEST_LOGIN_ENABLED__: boolean;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_API_BASE_URL?: string;
  /** Явно включить «Пропустить вход» на Production (Vercel → Env → пересборка). */
  readonly VITE_ALLOW_GUEST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
