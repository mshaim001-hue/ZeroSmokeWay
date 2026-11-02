-- User-confirmed estimate settings. Not inferred from living memory.

alter table public.player_progress
  add column if not exists quit_estimates jsonb;

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
    'quit_estimates', progress.quit_estimates,
    'updated_at', progress.updated_at,
    'intervals', intervals
  );
end;
$$;

create or replace function public.save_quit_estimates(p_estimates jsonb)
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
    set quit_estimates = p_estimates,
        updated_at = now()
    where user_id = uid and app_stage = 'support';
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.save_quit_estimates(jsonb) to authenticated;
