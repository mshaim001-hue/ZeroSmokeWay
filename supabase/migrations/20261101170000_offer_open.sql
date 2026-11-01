-- Visible next-scene offer is separate from readiness (can_advance).
alter table public.player_progress
  add column if not exists offer_open boolean not null default false;
