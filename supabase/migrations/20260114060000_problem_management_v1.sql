create extension if not exists pgcrypto;

-- Problem Management v1

do $$
begin
  if not exists (select 1 from pg_class where relname = 'problem_number_seq') then
    create sequence public.problem_number_seq;
  end if;
end
$$;

create or replace function public.generate_problem_number()
returns text
language sql
volatile
security definer
set search_path = public
as $$
  select 'P ' || lpad(nextval('public.problem_number_seq')::text, 6, '0');
$$;

create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  problem_number text not null default public.generate_problem_number(),
  title text not null,
  description text,
  status text not null default 'open',
  priority text not null default 'medium',
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists problems_problem_number_uq on public.problems (problem_number);
create index if not exists problems_status_idx on public.problems (status);
create index if not exists problems_priority_idx on public.problems (priority);
create index if not exists problems_created_at_idx on public.problems (created_at desc);
create index if not exists problems_assignee_id_idx on public.problems (assignee_id);

drop trigger if exists problems_set_updated_at on public.problems;
create trigger problems_set_updated_at
before update on public.problems
for each row execute procedure public.set_updated_at();

create table if not exists public.problem_tickets (
  problem_id uuid not null references public.problems(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  relationship text not null default 'related',
  created_at timestamptz not null default now(),
  primary key (problem_id, ticket_id)
);

create index if not exists problem_tickets_ticket_id_idx on public.problem_tickets (ticket_id);

alter table public.problems enable row level security;
alter table public.problem_tickets enable row level security;

drop policy if exists problems_select on public.problems;
create policy problems_select
on public.problems
for select
to authenticated
using (
  public.is_global_admin()
  or public.can_work_tickets()
);

drop policy if exists problems_insert on public.problems;
create policy problems_insert
on public.problems
for insert
to authenticated
with check (
  (public.is_global_admin() or public.can_work_tickets())
  and created_by = auth.uid()
);

drop policy if exists problems_update on public.problems;
create policy problems_update
on public.problems
for update
to authenticated
using (public.is_global_admin() or public.can_work_tickets())
with check (public.is_global_admin() or public.can_work_tickets());

drop policy if exists problems_delete on public.problems;
create policy problems_delete
on public.problems
for delete
to authenticated
using (public.is_global_admin());

drop policy if exists problem_tickets_select on public.problem_tickets;
create policy problem_tickets_select
on public.problem_tickets
for select
to authenticated
using (
  exists(
    select 1
    from public.problems p
    where p.id = problem_tickets.problem_id
  )
  and exists(
    select 1
    from public.tickets t
    where t.id = problem_tickets.ticket_id
  )
);

drop policy if exists problem_tickets_insert on public.problem_tickets;
create policy problem_tickets_insert
on public.problem_tickets
for insert
to authenticated
with check (
  (public.is_global_admin() or public.can_work_tickets())
  and exists(
    select 1
    from public.problems p
    where p.id = problem_tickets.problem_id
  )
  and exists(
    select 1
    from public.tickets t
    where t.id = problem_tickets.ticket_id
  )
);

drop policy if exists problem_tickets_delete on public.problem_tickets;
create policy problem_tickets_delete
on public.problem_tickets
for delete
to authenticated
using (
  (public.is_global_admin() or public.can_work_tickets())
  and exists(
    select 1
    from public.problems p
    where p.id = problem_tickets.problem_id
  )
  and exists(
    select 1
    from public.tickets t
    where t.id = problem_tickets.ticket_id
  )
);
