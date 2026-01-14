create extension if not exists pgcrypto;

create table if not exists public.ticket_watchers (
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (ticket_id, user_id)
);

create index if not exists ticket_watchers_user_id_idx on public.ticket_watchers (user_id);

alter table public.ticket_watchers enable row level security;

drop policy if exists ticket_watchers_select on public.ticket_watchers;
create policy ticket_watchers_select
on public.ticket_watchers
for select
to authenticated
using (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_watchers.ticket_id
  )
);

drop policy if exists ticket_watchers_insert on public.ticket_watchers;
create policy ticket_watchers_insert
on public.ticket_watchers
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists(
    select 1
    from public.tickets t
    where t.id = ticket_watchers.ticket_id
  )
);

drop policy if exists ticket_watchers_delete on public.ticket_watchers;
create policy ticket_watchers_delete
on public.ticket_watchers
for delete
to authenticated
using (
  user_id = auth.uid()
  and exists(
    select 1
    from public.tickets t
    where t.id = ticket_watchers.ticket_id
  )
);
