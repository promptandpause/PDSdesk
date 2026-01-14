create extension if not exists pgcrypto;

create table if not exists public.ticket_tasks (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open',
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists ticket_tasks_ticket_id_idx on public.ticket_tasks (ticket_id);
create index if not exists ticket_tasks_assigned_to_idx on public.ticket_tasks (assigned_to);
create index if not exists ticket_tasks_status_idx on public.ticket_tasks (status);

drop trigger if exists ticket_tasks_set_updated_at on public.ticket_tasks;
create trigger ticket_tasks_set_updated_at
before update on public.ticket_tasks
for each row execute procedure public.set_updated_at();

alter table public.ticket_tasks enable row level security;

drop policy if exists ticket_tasks_select on public.ticket_tasks;
create policy ticket_tasks_select
on public.ticket_tasks
for select
to authenticated
using (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_tasks.ticket_id
  )
);

drop policy if exists ticket_tasks_insert on public.ticket_tasks;
create policy ticket_tasks_insert
on public.ticket_tasks
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists(
    select 1
    from public.tickets t
    where t.id = ticket_tasks.ticket_id
      and (
        public.is_global_admin()
        or (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_tasks_update on public.ticket_tasks;
create policy ticket_tasks_update
on public.ticket_tasks
for update
to authenticated
using (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_tasks.ticket_id
      and (
        public.is_global_admin()
        or assigned_to = auth.uid()
        or (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
)
with check (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_tasks.ticket_id
      and (
        public.is_global_admin()
        or assigned_to = auth.uid()
        or (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_tasks_delete on public.ticket_tasks;
create policy ticket_tasks_delete
on public.ticket_tasks
for delete
to authenticated
using (
  public.is_global_admin()
  or created_by = auth.uid()
);
