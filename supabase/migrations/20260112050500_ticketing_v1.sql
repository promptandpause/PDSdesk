-- Ticketing v1 domain schema

create extension if not exists pgcrypto;

-- Role helper for ticket work
create or replace function public.can_work_tickets()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('global_admin')
      or public.has_role('service_desk_admin')
      or public.has_role('operator');
$$;

-- Enums (use text if you prefer easier evolution)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'ticket_status') then
    create type public.ticket_status as enum ('new', 'open', 'pending', 'resolved', 'closed');
  end if;
  if not exists (select 1 from pg_type where typname = 'ticket_priority') then
    create type public.ticket_priority as enum ('low', 'medium', 'high', 'urgent');
  end if;
end
$$;

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status public.ticket_status not null default 'new',
  priority public.ticket_priority not null default 'medium',
  requester_id uuid not null references public.profiles(id) on delete restrict,
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tickets_requester_id_idx on public.tickets (requester_id);
create index if not exists tickets_assignee_id_idx on public.tickets (assignee_id);
create index if not exists tickets_status_idx on public.tickets (status);
create index if not exists tickets_created_at_idx on public.tickets (created_at desc);

drop trigger if exists tickets_set_updated_at on public.tickets;
create trigger tickets_set_updated_at
before update on public.tickets
for each row execute procedure public.set_updated_at();

create table if not exists public.ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ticket_events_ticket_id_idx on public.ticket_events (ticket_id);
create index if not exists ticket_events_created_at_idx on public.ticket_events (created_at);

create table if not exists public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ticket_comments_ticket_id_idx on public.ticket_comments (ticket_id);
create index if not exists ticket_comments_created_at_idx on public.ticket_comments (created_at);

drop trigger if exists ticket_comments_set_updated_at on public.ticket_comments;
create trigger ticket_comments_set_updated_at
before update on public.ticket_comments
for each row execute procedure public.set_updated_at();

-- RLS
alter table public.tickets enable row level security;
alter table public.ticket_events enable row level security;
alter table public.ticket_comments enable row level security;

-- tickets
drop policy if exists tickets_select on public.tickets;
create policy tickets_select
on public.tickets
for select
to authenticated
using (
  public.can_work_tickets()
  or requester_id = auth.uid()
  or assignee_id = auth.uid()
  or created_by = auth.uid()
);

drop policy if exists tickets_insert on public.tickets;
create policy tickets_insert
on public.tickets
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (requester_id = auth.uid() or public.can_work_tickets())
);

drop policy if exists tickets_update on public.tickets;
create policy tickets_update
on public.tickets
for update
to authenticated
using (public.can_work_tickets())
with check (public.can_work_tickets());

drop policy if exists tickets_delete on public.tickets;
create policy tickets_delete
on public.tickets
for delete
to authenticated
using (public.is_global_admin());

-- ticket_events
drop policy if exists ticket_events_select on public.ticket_events;
create policy ticket_events_select
on public.ticket_events
for select
to authenticated
using (
  public.can_work_tickets()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_events.ticket_id
      and (t.requester_id = auth.uid() or t.assignee_id = auth.uid() or t.created_by = auth.uid())
  )
);

drop policy if exists ticket_events_insert on public.ticket_events;
create policy ticket_events_insert
on public.ticket_events
for insert
to authenticated
with check (
  public.can_work_tickets()
  and actor_id = auth.uid()
);

drop policy if exists ticket_events_update on public.ticket_events;
create policy ticket_events_update
on public.ticket_events
for update
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

drop policy if exists ticket_events_delete on public.ticket_events;
create policy ticket_events_delete
on public.ticket_events
for delete
to authenticated
using (public.is_global_admin());

-- ticket_comments
drop policy if exists ticket_comments_select on public.ticket_comments;
create policy ticket_comments_select
on public.ticket_comments
for select
to authenticated
using (
  public.can_work_tickets()
  or (
    is_internal = false
    and exists(
      select 1
      from public.tickets t
      where t.id = ticket_comments.ticket_id
        and (t.requester_id = auth.uid() or t.assignee_id = auth.uid() or t.created_by = auth.uid())
    )
  )
);

drop policy if exists ticket_comments_insert on public.ticket_comments;
create policy ticket_comments_insert
on public.ticket_comments
for insert
to authenticated
with check (
  author_id = auth.uid()
  and (
    public.can_work_tickets()
    or (
      is_internal = false
      and exists(
        select 1
        from public.tickets t
        where t.id = ticket_comments.ticket_id
          and (t.requester_id = auth.uid() or t.created_by = auth.uid())
      )
    )
  )
);

drop policy if exists ticket_comments_update on public.ticket_comments;
create policy ticket_comments_update
on public.ticket_comments
for update
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

drop policy if exists ticket_comments_delete on public.ticket_comments;
create policy ticket_comments_delete
on public.ticket_comments
for delete
to authenticated
using (public.is_global_admin());
