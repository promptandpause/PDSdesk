alter table public.ticket_slas
  add column if not exists first_response_breached boolean not null default false;

alter table public.ticket_slas
  add column if not exists first_response_breached_at timestamptz;

alter table public.ticket_slas
  add column if not exists resolution_breached boolean not null default false;

alter table public.ticket_slas
  add column if not exists resolution_breached_at timestamptz;

create table if not exists public.ticket_sla_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ticket_sla_events_ticket_id_idx on public.ticket_sla_events (ticket_id);
create index if not exists ticket_sla_events_event_type_idx on public.ticket_sla_events (event_type);
create index if not exists ticket_sla_events_created_at_idx on public.ticket_sla_events (created_at);

alter table public.ticket_sla_events enable row level security;

drop policy if exists ticket_sla_events_select on public.ticket_sla_events;
create policy ticket_sla_events_select
on public.ticket_sla_events
for select
to authenticated
using (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_sla_events.ticket_id
  )
);

drop policy if exists ticket_sla_events_insert on public.ticket_sla_events;
create policy ticket_sla_events_insert
on public.ticket_sla_events
for insert
to authenticated
with check (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_sla_events.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_sla_events_delete on public.ticket_sla_events;
create policy ticket_sla_events_delete
on public.ticket_sla_events
for delete
to authenticated
using (public.is_global_admin());
