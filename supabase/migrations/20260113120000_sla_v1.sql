create extension if not exists pgcrypto;

create table if not exists public.sla_policies (
  id uuid primary key default gen_random_uuid(),
  policy_key text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  priority int not null default 100,
  match_ticket_type text,
  match_priority text,
  match_category text,
  first_response_minutes int,
  resolution_minutes int,
  created_at timestamptz not null default now()
);

create index if not exists sla_policies_active_priority_idx
on public.sla_policies (is_active, priority);

create table if not exists public.ticket_slas (
  ticket_id uuid primary key references public.tickets(id) on delete cascade,
  sla_policy_id uuid references public.sla_policies(id) on delete set null,
  first_response_due_at timestamptz,
  resolution_due_at timestamptz,
  first_response_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists ticket_slas_set_updated_at on public.ticket_slas;
create trigger ticket_slas_set_updated_at
before update on public.ticket_slas
for each row execute procedure public.set_updated_at();

create or replace function public.tickets_apply_sla_policy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_policy_id uuid;
  v_first_minutes int;
  v_resolution_minutes int;
  v_first_due timestamptz;
  v_resolution_due timestamptz;
begin
  if tg_op <> 'INSERT' then
    return new;
  end if;

  select p.id, p.first_response_minutes, p.resolution_minutes
  into v_policy_id, v_first_minutes, v_resolution_minutes
  from public.sla_policies p
  where p.is_active = true
    and (p.match_ticket_type is null or lower(p.match_ticket_type) = lower(coalesce(new.ticket_type,'')))
    and (p.match_priority is null or lower(p.match_priority) = lower(coalesce(new.priority::text,'')))
    and (p.match_category is null or lower(p.match_category) = lower(coalesce(new.category,'')))
  order by p.priority asc
  limit 1;

  if v_policy_id is null then
    return new;
  end if;

  if v_first_minutes is not null then
    v_first_due := now() + make_interval(mins => v_first_minutes);
  end if;
  if v_resolution_minutes is not null then
    v_resolution_due := now() + make_interval(mins => v_resolution_minutes);
  end if;

  insert into public.ticket_slas (ticket_id, sla_policy_id, first_response_due_at, resolution_due_at)
  values (new.id, v_policy_id, v_first_due, v_resolution_due)
  on conflict (ticket_id) do update
    set sla_policy_id = excluded.sla_policy_id,
        first_response_due_at = excluded.first_response_due_at,
        resolution_due_at = excluded.resolution_due_at;

  return new;
end;
$$;

drop trigger if exists tickets_z_apply_sla_policy on public.tickets;
create trigger tickets_z_apply_sla_policy
after insert on public.tickets
for each row execute procedure public.tickets_apply_sla_policy();

alter table public.sla_policies enable row level security;
alter table public.ticket_slas enable row level security;

drop policy if exists sla_policies_select on public.sla_policies;
create policy sla_policies_select
on public.sla_policies
for select
to authenticated
using (true);

drop policy if exists sla_policies_admin_write on public.sla_policies;
create policy sla_policies_admin_write
on public.sla_policies
for all
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

drop policy if exists ticket_slas_select on public.ticket_slas;
create policy ticket_slas_select
on public.ticket_slas
for select
to authenticated
using (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_slas.ticket_id
  )
);

drop policy if exists ticket_slas_insert on public.ticket_slas;
create policy ticket_slas_insert
on public.ticket_slas
for insert
to authenticated
with check (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_slas.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_slas_update on public.ticket_slas;
create policy ticket_slas_update
on public.ticket_slas
for update
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_slas.ticket_id
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
    where t.id = ticket_slas.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_slas_delete on public.ticket_slas;
create policy ticket_slas_delete
on public.ticket_slas
for delete
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_slas.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

insert into public.sla_policies (policy_key, name, priority, match_ticket_type, first_response_minutes, resolution_minutes)
values
  ('default_customer_service', 'Default Customer Service SLA', 50, 'customer_service', 240, 2880),
  ('default_itsm_incident', 'Default IT Incident SLA', 60, 'itsm_incident', 120, 1440)
on conflict (policy_key) do nothing;
