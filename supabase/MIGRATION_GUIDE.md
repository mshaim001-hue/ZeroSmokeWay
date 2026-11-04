# Current application database

Use the migrations below for the cinematic journey and support home. Apply each once, in order, on the intended Supabase project; the SQL editor does not maintain CLI migration history automatically. Enable Google authentication separately as described in the root README.

1. `20261030000000_player_progress.sql`
2. `20261031120000_dialogue_memory.sql`
3. `20261101170000_offer_open.sql`
4. `20261102120000_support_stage.sql`
5. `20261102140000_support_locks.sql`
6. `20261102150000_save_support_content.sql`
7. `20261102160000_quit_estimates.sql`

The current app uses `player_progress`, `abstinence_intervals`, authenticated lifecycle RPCs, and row-level security. These migrations define the current schema; old `schema.sql` and `schema_improved.sql` drafts are available in Git history and must not be used as bootstrap instructions.

The three earlier migration files describe the legacy knowledge-base, conversations, and email-queue prototype. They remain in the repository to preserve migration history. Do not rewrite applied migrations or reset a live database. If your project already applied migrations, add a forward migration for any further changes.

Backend stage checks require `SUPABASE_URL` and `SUPABASE_ANON_KEY`; the browser requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Keep credentials in deployment settings or ignored environment files.
