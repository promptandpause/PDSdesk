create extension if not exists pgcrypto;

create table if not exists public.ticket_approval_requests (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  approval_type text not null default 'change',
  status text not null default 'pending',
  requested_by uuid not null references public.profiles(id) on delete restrict,
  requested_at timestamptz not null default now(),
  due_at timestamptz,
  notes text
);

create index if not exists ticket_approval_requests_ticket_id_idx on public.ticket_approval_requests (ticket_id);
create index if not exists ticket_approval_requests_status_idx on public.ticket_approval_requests (status);

create table if not exists public.ticket_approval_decisions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.ticket_approval_requests(id) on delete cascade,
  approver_id uuid not null references public.profiles(id) on delete restrict,
  decision text not null,
  decided_at timestamptz not null default now(),
  comment text
);

create unique index if not exists ticket_approval_decisions_unique
on public.ticket_approval_decisions (request_id, approver_id);

create index if not exists ticket_approval_decisions_approver_id_idx on public.ticket_approval_decisions (approver_id);

alter table public.ticket_approval_requests enable row level security;
alter table public.ticket_approval_decisions enable row level security;

drop policy if exists ticket_approval_requests_select on public.ticket_approval_requests;
create policy ticket_approval_requests_select
on public.ticket_approval_requests
for select
to authenticated
using (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_approval_requests.ticket_id
  )
);

drop policy if exists ticket_approval_requests_insert on public.ticket_approval_requests;
create policy ticket_approval_requests_insert
on public.ticket_approval_requests
for insert
to authenticated
with check (
  requested_by = auth.uid()
  and (
    public.is_global_admin()
    or public.can_work_tickets()
    or public.is_in_operator_group('customer_service')
  )
  and exists(
    select 1
    from public.tickets t
    where t.id = ticket_approval_requests.ticket_id
  )
);

drop policy if exists ticket_approval_requests_update on public.ticket_approval_requests;
create policy ticket_approval_requests_update
on public.ticket_approval_requests
for update
to authenticated
using (
  public.is_global_admin() or public.can_work_tickets() or public.is_in_operator_group('customer_service')
)
with check (
  public.is_global_admin() or public.can_work_tickets() or public.is_in_operator_group('customer_service')
);

drop policy if exists ticket_approval_requests_delete on public.ticket_approval_requests;
create policy ticket_approval_requests_delete
on public.ticket_approval_requests
for delete
to authenticated
using (public.is_global_admin());

drop policy if exists ticket_approval_decisions_select on public.ticket_approval_decisions;
create policy ticket_approval_decisions_select
on public.ticket_approval_decisions
for select
to authenticated
using (
  exists(
    select 1
    from public.ticket_approval_requests r
    where r.id = ticket_approval_decisions.request_id
      and exists(
        select 1
        from public.tickets t
        where t.id = r.ticket_id
      )
  )
);

drop policy if exists ticket_approval_decisions_insert on public.ticket_approval_decisions;
create policy ticket_approval_decisions_insert
on public.ticket_approval_decisions
for insert
to authenticated
with check (
  approver_id = auth.uid()
  and exists(
    select 1
    from public.ticket_approval_requests r
    where r.id = ticket_approval_decisions.request_id
      and exists(
        select 1
        from public.tickets t
        where t.id = r.ticket_id
      )
  )
);

drop policy if exists ticket_approval_decisions_delete on public.ticket_approval_decisions;
create policy ticket_approval_decisions_delete
on public.ticket_approval_decisions
for delete
to authenticated
using (public.is_global_admin());
