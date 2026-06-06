-- Очередь email-писем от Алекса пользователям после регистрации
create table if not exists public.email_queue (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text not null,
  subject     text not null,
  body_html   text not null,
  send_after  timestamptz not null,
  sent_at     timestamptz,
  error       text,
  created_at  timestamptz default now()
);

create index if not exists email_queue_pending_idx
  on public.email_queue (send_after)
  where sent_at is null and error is null;

-- Только сервисный ключ может читать/писать очередь
alter table public.email_queue enable row level security;

create policy "service_only" on public.email_queue
  using (false);
