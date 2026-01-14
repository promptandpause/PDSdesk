create table if not exists public.ticket_incidents (
  ticket_id uuid primary key references public.tickets(id) on delete cascade,
  impact text,
  urgency text,
  is_outage boolean not null default false,
  affected_service text,
  resolution_summary text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_problems (
  ticket_id uuid primary key references public.tickets(id) on delete cascade,
  root_cause text,
  workaround text,
  is_known_error boolean not null default false,
  permanent_fix text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_changes (
  ticket_id uuid primary key references public.tickets(id) on delete cascade,
  change_type text not null default 'standard',
  risk_level text,
  implementation_plan text,
  rollback_plan text,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  approval_status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_service_requests (
  ticket_id uuid primary key references public.tickets(id) on delete cascade,
  request_item text,
  fulfillment_notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ticket_incidents_resolved_at_idx on public.ticket_incidents (resolved_at);
create index if not exists ticket_changes_scheduled_start_at_idx on public.ticket_changes (scheduled_start_at);
create index if not exists ticket_changes_approval_status_idx on public.ticket_changes (approval_status);

drop trigger if exists ticket_incidents_set_updated_at on public.ticket_incidents;
create trigger ticket_incidents_set_updated_at
before update on public.ticket_incidents
for each row execute procedure public.set_updated_at();

drop trigger if exists ticket_problems_set_updated_at on public.ticket_problems;
create trigger ticket_problems_set_updated_at
before update on public.ticket_problems
for each row execute procedure public.set_updated_at();

drop trigger if exists ticket_changes_set_updated_at on public.ticket_changes;
create trigger ticket_changes_set_updated_at
before update on public.ticket_changes
for each row execute procedure public.set_updated_at();

drop trigger if exists ticket_service_requests_set_updated_at on public.ticket_service_requests;
create trigger ticket_service_requests_set_updated_at
before update on public.ticket_service_requests
for each row execute procedure public.set_updated_at();

alter table public.ticket_incidents enable row level security;
alter table public.ticket_problems enable row level security;
alter table public.ticket_changes enable row level security;
alter table public.ticket_service_requests enable row level security;

drop policy if exists ticket_incidents_select on public.ticket_incidents;
create policy ticket_incidents_select
on public.ticket_incidents
for select
to authenticated
using (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_incidents.ticket_id
  )
);

drop policy if exists ticket_problems_select on public.ticket_problems;
create policy ticket_problems_select
on public.ticket_problems
for select
to authenticated
using (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_problems.ticket_id
  )
);

drop policy if exists ticket_changes_select on public.ticket_changes;
create policy ticket_changes_select
on public.ticket_changes
for select
to authenticated
using (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_changes.ticket_id
  )
);

drop policy if exists ticket_service_requests_select on public.ticket_service_requests;
create policy ticket_service_requests_select
on public.ticket_service_requests
for select
to authenticated
using (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_service_requests.ticket_id
  )
);

drop policy if exists ticket_incidents_insert on public.ticket_incidents;
create policy ticket_incidents_insert
on public.ticket_incidents
for insert
to authenticated
with check (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_incidents.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_incidents_update on public.ticket_incidents;
create policy ticket_incidents_update
on public.ticket_incidents
for update
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_incidents.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
)
with check (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_incidents.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_incidents_delete on public.ticket_incidents;
create policy ticket_incidents_delete
on public.ticket_incidents
for delete
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_incidents.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_problems_insert on public.ticket_problems;
create policy ticket_problems_insert
on public.ticket_problems
for insert
to authenticated
with check (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_problems.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_problems_update on public.ticket_problems;
create policy ticket_problems_update
on public.ticket_problems
for update
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_problems.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
)
with check (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_problems.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_problems_delete on public.ticket_problems;
create policy ticket_problems_delete
on public.ticket_problems
for delete
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_problems.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_changes_insert on public.ticket_changes;
create policy ticket_changes_insert
on public.ticket_changes
for insert
to authenticated
with check (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_changes.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_changes_update on public.ticket_changes;
create policy ticket_changes_update
on public.ticket_changes
for update
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_changes.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
)
with check (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_changes.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_changes_delete on public.ticket_changes;
create policy ticket_changes_delete
on public.ticket_changes
for delete
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_changes.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_service_requests_insert on public.ticket_service_requests;
create policy ticket_service_requests_insert
on public.ticket_service_requests
for insert
to authenticated
with check (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_service_requests.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_service_requests_update on public.ticket_service_requests;
create policy ticket_service_requests_update
on public.ticket_service_requests
for update
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_service_requests.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
)
with check (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_service_requests.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_service_requests_delete on public.ticket_service_requests;
create policy ticket_service_requests_delete
on public.ticket_service_requests
for delete
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_service_requests.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);
