-- Google sign-in progress for the cinematic path.
-- Source of truth is this row; the phone keeps a cache of the same JSON.

create table if not exists public.player_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  scene_id text not null default 'pitcher',
  phase text not null default 'idle' check (phase in ('idle', 'chat')),
  chat jsonb not null default '[]'::jsonb,
  seen_intro boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.player_progress enable row level security;

drop policy if exists "player_progress_select_own" on public.player_progress;
drop policy if exists "player_progress_insert_own" on public.player_progress;
drop policy if exists "player_progress_update_own" on public.player_progress;

create policy "player_progress_select_own"
  on public.player_progress for select
  using (auth.uid() = user_id);

create policy "player_progress_insert_own"
  on public.player_progress for insert
  with check (auth.uid() = user_id);

create policy "player_progress_update_own"
  on public.player_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on table public.player_progress to authenticated;
