-- Journey / preparing_to_start / support. One current abstinence interval.
-- Source of truth stays player_progress plus abstinence_intervals. Do not use user_profiles.

alter table public.player_progress
  add column if not exists app_stage text not null default 'journey',
  add column if not exists completion_offered boolean not null default false,
  add column if not exists intended_at timestamptz,
  add column if not exists current_interval_id uuid,
  add column if not exists smoking_status text,
  add column if not exists support_chat jsonb not null default '[]'::jsonb;

alter table public.player_progress
  drop constraint if exists player_progress_app_stage_check;
alter table public.player_progress
  add constraint player_progress_app_stage_check
  check (app_stage in ('journey', 'preparing_to_start', 'support'));

alter table public.player_progress
  drop constraint if exists player_progress_smoking_status_check;
alter table public.player_progress
  add constraint player_progress_smoking_status_check
  check (smoking_status is null or smoking_status in ('abstaining', 'smoking'));

create table if not exists public.abstinence_intervals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  source text not null check (source in ('now', 'entered')),
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create unique index if not exists abstinence_intervals_one_open
  on public.abstinence_intervals (user_id)
  where ended_at is null;

create index if not exists abstinence_intervals_user_id
  on public.abstinence_intervals (user_id, started_at desc);

alter table public.abstinence_intervals enable row level security;

drop policy if exists "abstinence_intervals_select_own" on public.abstinence_intervals;
create policy "abstinence_intervals_select_own"
  on public.abstinence_intervals for select
  using (auth.uid() = user_id);

grant select on table public.abstinence_intervals to authenticated;

create or replace function public.player_progress_freeze_support()
returns trigger
language plpgsql
as $$
begin
  if old.app_stage = 'support' and current_setting('zsw.allow_stage_change', true) is distinct from '1' then
    new.app_stage := 'support';
    new.scene_id := old.scene_id;
    new.phase := old.phase;
    new.chat := old.chat;
    new.can_advance := false;
    new.offer_open := false;
    new.smoking_status := old.smoking_status;
    new.current_interval_id := old.current_interval_id;
    new.intended_at := old.intended_at;
  end if;
  return new;
end;
$$;

drop trigger if exists player_progress_freeze_support on public.player_progress;
create trigger player_progress_freeze_support
  before update on public.player_progress
  for each row
  execute procedure public.player_progress_freeze_support();

create or replace function public.zsw_progress_snapshot(uid uuid)
returns jsonb
language plpgsql
stable
as $$
declare
  progress public.player_progress;
  intervals jsonb;
begin
  select * into progress from public.player_progress where user_id = uid;
  if not found then
    return jsonb_build_object('app_stage', 'journey', 'intervals', '[]'::jsonb);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id,
    'started_at', i.started_at,
    'ended_at', i.ended_at,
    'source', i.source
  ) order by i.started_at desc), '[]'::jsonb)
    into intervals
    from public.abstinence_intervals i
    where i.user_id = uid;
  return jsonb_build_object(
    'scene_id', progress.scene_id,
    'phase', progress.phase,
    'chat', progress.chat,
    'seen_intro', progress.seen_intro,
    'can_advance', progress.can_advance,
    'offer_open', progress.offer_open,
    'memory', progress.memory,
    'app_stage', progress.app_stage,
    'completion_offered', progress.completion_offered,
    'intended_at', progress.intended_at,
    'current_interval_id', progress.current_interval_id,
    'smoking_status', progress.smoking_status,
    'support_chat', progress.support_chat,
    'updated_at', progress.updated_at,
    'intervals', intervals
  );
end;
$$;

create or replace function public.declare_intent()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.player_progress (user_id) values (uid)
    on conflict (user_id) do nothing;
  update public.player_progress
    set app_stage = case when app_stage = 'support' then app_stage else 'preparing_to_start' end,
        intended_at = coalesce(intended_at, now()),
        completion_offered = true,
        updated_at = now()
    where user_id = uid;
  return public.zsw_progress_snapshot(uid);
end;
$$;

create or replace function public.confirm_last_cigarette(p_at timestamptz, p_source text default 'now')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  progress public.player_progress;
  open_id uuid;
  new_id uuid;
  source text := case when p_source = 'entered' then 'entered' else 'now' end;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_at is null then raise exception 'invalid_time'; end if;
  if p_at > now() + interval '2 minutes' then raise exception 'future_time'; end if;
  perform set_config('zsw.allow_stage_change', '1', true);
  insert into public.player_progress (user_id) values (uid)
    on conflict (user_id) do nothing;
  select * into progress from public.player_progress where user_id = uid;
  select id into open_id from public.abstinence_intervals
    where user_id = uid and ended_at is null
    limit 1;
  if progress.app_stage = 'support' and open_id is not null then
    return public.zsw_progress_snapshot(uid);
  end if;
  insert into public.abstinence_intervals (user_id, started_at, source)
    values (uid, p_at, source)
    returning id into new_id;
  update public.player_progress
    set app_stage = 'support',
        smoking_status = 'abstaining',
        current_interval_id = new_id,
        completion_offered = true,
        intended_at = coalesce(intended_at, now()),
        can_advance = false,
        offer_open = false,
        updated_at = now()
    where user_id = uid;
  return public.zsw_progress_snapshot(uid);
end;
$$;

create or replace function public.record_smoked(p_at timestamptz default null, p_restart boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  progress public.player_progress;
  closed_at timestamptz := coalesce(p_at, now());
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if closed_at > now() + interval '2 minutes' then raise exception 'future_time'; end if;
  perform set_config('zsw.allow_stage_change', '1', true);
  select * into progress from public.player_progress where user_id = uid;
  if progress.user_id is null or progress.app_stage is distinct from 'support' then
    raise exception 'not_in_support';
  end if;
  update public.abstinence_intervals
    set ended_at = closed_at
    where user_id = uid and ended_at is null;
  if p_restart then
    return public.confirm_last_cigarette(closed_at, 'entered');
  end if;
  update public.player_progress
    set smoking_status = 'smoking',
        current_interval_id = null,
        updated_at = now()
    where user_id = uid;
  return public.zsw_progress_snapshot(uid);
end;
$$;

create or replace function public.save_support_chat(p_chat jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update public.player_progress
    set support_chat = coalesce(p_chat, '[]'::jsonb),
        updated_at = now()
    where user_id = uid and app_stage = 'support';
  return public.zsw_progress_snapshot(uid);
end;
$$;

grant execute on function public.declare_intent() to authenticated;
grant execute on function public.confirm_last_cigarette(timestamptz, text) to authenticated;
grant execute on function public.record_smoked(timestamptz, boolean) to authenticated;
grant execute on function public.save_support_chat(jsonb) to authenticated;
