create extension if not exists pgcrypto;

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete set null,
  event_type text not null,
  title text,
  body text,
  payload jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_id_idx on public.user_notifications (user_id);
create index if not exists user_notifications_user_created_at_idx on public.user_notifications (user_id, created_at desc);
create index if not exists user_notifications_ticket_id_idx on public.user_notifications (ticket_id);

alter table public.user_notifications enable row level security;

drop policy if exists user_notifications_select_own on public.user_notifications;
create policy user_notifications_select_own
on public.user_notifications
for select
to authenticated
using (user_id = auth.uid() or public.is_global_admin());

drop policy if exists user_notifications_update_own on public.user_notifications;
create policy user_notifications_update_own
on public.user_notifications
for update
to authenticated
using (user_id = auth.uid() or public.is_global_admin())
with check (user_id = auth.uid() or public.is_global_admin());

drop policy if exists user_notifications_delete_admin on public.user_notifications;
create policy user_notifications_delete_admin
on public.user_notifications
for delete
to authenticated
using (public.is_global_admin() or public.has_role('service_desk_admin'));

drop policy if exists user_notifications_insert_admin on public.user_notifications;
create policy user_notifications_insert_admin
on public.user_notifications
for insert
to authenticated
with check (public.is_global_admin() or public.has_role('service_desk_admin'));
