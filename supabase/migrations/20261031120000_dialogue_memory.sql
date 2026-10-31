-- Living dialogue memory and server-granted permission to offer the next scene.
-- Agreement (the player tapping Next) is a separate client action.

alter table public.player_progress
  add column if not exists can_advance boolean not null default false,
  add column if not exists memory jsonb not null default '[]'::jsonb;
