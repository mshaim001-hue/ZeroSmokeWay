-- Serialize confirm/record on the progress row. source=now uses server time.
-- Entered times may be up to two minutes ahead of server clock (device skew).
-- A restart replay within two seconds of the open interval start is a no-op.

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
  perform 1 from public.player_progress where user_id = uid for update;
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
  started timestamptz;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  perform set_config('zsw.allow_stage_change', '1', true);
  insert into public.player_progress (user_id) values (uid)
    on conflict (user_id) do nothing;
  select * into progress from public.player_progress where user_id = uid for update;
  select id into open_id from public.abstinence_intervals
    where user_id = uid and ended_at is null
    for update;
  if progress.app_stage = 'support' and open_id is not null then
    return public.zsw_progress_snapshot(uid);
  end if;
  if source = 'now' then
    started := now();
  else
    if p_at is null then raise exception 'invalid_time'; end if;
    if p_at > now() + interval '2 minutes' then raise exception 'future_time'; end if;
    started := p_at;
  end if;
  begin
    insert into public.abstinence_intervals (user_id, started_at, source)
      values (uid, started, source)
      returning id into new_id;
  exception when unique_violation then
    return public.zsw_progress_snapshot(uid);
  end;
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
  open_row public.abstinence_intervals;
  closed_at timestamptz;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  perform set_config('zsw.allow_stage_change', '1', true);
  select * into progress from public.player_progress where user_id = uid for update;
  if progress.user_id is null or progress.app_stage is distinct from 'support' then
    raise exception 'not_in_support';
  end if;
  select * into open_row from public.abstinence_intervals
    where user_id = uid and ended_at is null
    for update;
  closed_at := coalesce(p_at, now());
  if closed_at > now() + interval '2 minutes' then raise exception 'future_time'; end if;

  if not p_restart then
    if open_row.id is null and progress.smoking_status = 'smoking' then
      return public.zsw_progress_snapshot(uid);
    end if;
    if open_row.id is not null then
      update public.abstinence_intervals set ended_at = closed_at where id = open_row.id;
    end if;
    update public.player_progress
      set smoking_status = 'smoking',
          current_interval_id = null,
          updated_at = now()
      where user_id = uid;
    return public.zsw_progress_snapshot(uid);
  end if;

  if open_row.id is not null
     and abs(extract(epoch from (open_row.started_at - closed_at))) < 2 then
    return public.zsw_progress_snapshot(uid);
  end if;
  if open_row.id is not null then
    update public.abstinence_intervals set ended_at = closed_at where id = open_row.id;
  end if;
  return public.confirm_last_cigarette(closed_at, 'entered');
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
  perform 1 from public.player_progress where user_id = uid for update;
  update public.player_progress
    set support_chat = coalesce(p_chat, '[]'::jsonb),
        updated_at = now()
    where user_id = uid and app_stage = 'support';
  return jsonb_build_object('ok', true);
end;
$$;
