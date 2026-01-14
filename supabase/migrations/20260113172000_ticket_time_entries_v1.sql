create extension if not exists pgcrypto;

create table if not exists public.ticket_time_entries (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  minutes integer not null check (minutes > 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists ticket_time_entries_ticket_id_idx on public.ticket_time_entries (ticket_id);
create index if not exists ticket_time_entries_created_at_idx on public.ticket_time_entries (created_at);

alter table public.ticket_time_entries enable row level security;

drop policy if exists ticket_time_entries_select on public.ticket_time_entries;
create policy ticket_time_entries_select
on public.ticket_time_entries
for select
to authenticated
using (
  public.is_global_admin()
  or public.can_work_tickets()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_time_entries.ticket_id
      and (t.requester_id = auth.uid() or t.assignee_id = auth.uid() or t.created_by = auth.uid())
  )
);

drop policy if exists ticket_time_entries_insert on public.ticket_time_entries;
create policy ticket_time_entries_insert
on public.ticket_time_entries
for insert
to authenticated
with check (
  (public.is_global_admin() or public.can_work_tickets())
  and user_id = auth.uid()
  and exists(
    select 1
    from public.tickets t
    where t.id = ticket_time_entries.ticket_id
  )
);

drop policy if exists ticket_time_entries_delete on public.ticket_time_entries;
create policy ticket_time_entries_delete
on public.ticket_time_entries
for delete
to authenticated
using (public.is_global_admin());
