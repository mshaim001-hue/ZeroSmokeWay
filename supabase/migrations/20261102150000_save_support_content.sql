-- Persist support chat and living memory without touching stage or intervals.

create or replace function public.save_support_content(p_chat jsonb, p_memory jsonb)
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
    set support_chat = case when jsonb_typeof(coalesce(p_chat, '[]'::jsonb)) = 'array' then p_chat else support_chat end,
        memory = case when jsonb_typeof(coalesce(p_memory, '[]'::jsonb)) = 'array' then p_memory else memory end,
        updated_at = now()
    where user_id = uid and app_stage = 'support';
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.save_support_content(jsonb, jsonb) to authenticated;
