create extension if not exists pgcrypto;

create table if not exists public.notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete cascade,
  assignment_group_id uuid references public.operator_groups(id) on delete cascade,
  event_types text[] not null default '{}'::text[],
  channel text not null default 'in_app',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint notification_subscriptions_target_check check (
    ticket_id is not null or assignment_group_id is not null
  )
);

create index if not exists notification_subscriptions_user_id_idx on public.notification_subscriptions (user_id);
create index if not exists notification_subscriptions_ticket_id_idx on public.notification_subscriptions (ticket_id);
create index if not exists notification_subscriptions_assignment_group_id_idx on public.notification_subscriptions (assignment_group_id);

create table if not exists public.oncall_schedules (
  id uuid primary key default gen_random_uuid(),
  schedule_key text not null unique,
  name text not null,
  description text,
  timezone text not null default 'UTC',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.oncall_schedule_rotations (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.oncall_schedules(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists oncall_schedule_rotations_schedule_id_idx on public.oncall_schedule_rotations (schedule_id);

create table if not exists public.oncall_rotation_participants (
  rotation_id uuid not null references public.oncall_schedule_rotations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  primary key (rotation_id, user_id)
);

create index if not exists oncall_rotation_participants_user_id_idx on public.oncall_rotation_participants (user_id);

create table if not exists public.escalation_policies (
  id uuid primary key default gen_random_uuid(),
  policy_key text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  priority int not null default 100,
  match_ticket_type text,
  match_assignment_group_id uuid references public.operator_groups(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists escalation_policies_active_priority_idx on public.escalation_policies (is_active, priority);
create index if not exists escalation_policies_match_group_idx on public.escalation_policies (match_assignment_group_id);

create table if not exists public.escalation_policy_steps (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.escalation_policies(id) on delete cascade,
  step_order int not null,
  delay_minutes int not null default 0,
  notify_user_id uuid references public.profiles(id) on delete set null,
  notify_group_id uuid references public.operator_groups(id) on delete set null,
  notify_channel text not null default 'in_app',
  created_at timestamptz not null default now(),
  unique (policy_id, step_order)
);

create index if not exists escalation_policy_steps_policy_id_idx on public.escalation_policy_steps (policy_id);

create table if not exists public.ticket_escalations (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  policy_id uuid references public.escalation_policies(id) on delete set null,
  status text not null default 'open',
  current_step int not null default 0,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ticket_escalations_ticket_id_idx on public.ticket_escalations (ticket_id);
create index if not exists ticket_escalations_next_run_at_idx on public.ticket_escalations (next_run_at);

drop trigger if exists ticket_escalations_set_updated_at on public.ticket_escalations;
create trigger ticket_escalations_set_updated_at
before update on public.ticket_escalations
for each row execute procedure public.set_updated_at();

create table if not exists public.ticket_escalation_events (
  id uuid primary key default gen_random_uuid(),
  ticket_escalation_id uuid not null references public.ticket_escalations(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ticket_escalation_events_ticket_escalation_id_idx on public.ticket_escalation_events (ticket_escalation_id);
create index if not exists ticket_escalation_events_created_at_idx on public.ticket_escalation_events (created_at);

alter table public.notification_subscriptions enable row level security;
alter table public.oncall_schedules enable row level security;
alter table public.oncall_schedule_rotations enable row level security;
alter table public.oncall_rotation_participants enable row level security;
alter table public.escalation_policies enable row level security;
alter table public.escalation_policy_steps enable row level security;
alter table public.ticket_escalations enable row level security;
alter table public.ticket_escalation_events enable row level security;

drop policy if exists notification_subscriptions_select on public.notification_subscriptions;
create policy notification_subscriptions_select
on public.notification_subscriptions
for select
to authenticated
using (user_id = auth.uid() or public.is_global_admin());

drop policy if exists notification_subscriptions_insert on public.notification_subscriptions;
create policy notification_subscriptions_insert
on public.notification_subscriptions
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists notification_subscriptions_delete on public.notification_subscriptions;
create policy notification_subscriptions_delete
on public.notification_subscriptions
for delete
to authenticated
using (user_id = auth.uid() or public.is_global_admin());

drop policy if exists oncall_schedules_select on public.oncall_schedules;
create policy oncall_schedules_select
on public.oncall_schedules
for select
to authenticated
using (true);

drop policy if exists oncall_schedules_admin_write on public.oncall_schedules;
create policy oncall_schedules_admin_write
on public.oncall_schedules
for all
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

drop policy if exists oncall_schedule_rotations_select on public.oncall_schedule_rotations;
create policy oncall_schedule_rotations_select
on public.oncall_schedule_rotations
for select
to authenticated
using (true);

drop policy if exists oncall_schedule_rotations_admin_write on public.oncall_schedule_rotations;
create policy oncall_schedule_rotations_admin_write
on public.oncall_schedule_rotations
for all
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

drop policy if exists oncall_rotation_participants_select on public.oncall_rotation_participants;
create policy oncall_rotation_participants_select
on public.oncall_rotation_participants
for select
to authenticated
using (true);

drop policy if exists oncall_rotation_participants_admin_write on public.oncall_rotation_participants;
create policy oncall_rotation_participants_admin_write
on public.oncall_rotation_participants
for all
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

drop policy if exists escalation_policies_select on public.escalation_policies;
create policy escalation_policies_select
on public.escalation_policies
for select
to authenticated
using (true);

drop policy if exists escalation_policies_admin_write on public.escalation_policies;
create policy escalation_policies_admin_write
on public.escalation_policies
for all
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

drop policy if exists escalation_policy_steps_select on public.escalation_policy_steps;
create policy escalation_policy_steps_select
on public.escalation_policy_steps
for select
to authenticated
using (true);

drop policy if exists escalation_policy_steps_admin_write on public.escalation_policy_steps;
create policy escalation_policy_steps_admin_write
on public.escalation_policy_steps
for all
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

drop policy if exists ticket_escalations_select on public.ticket_escalations;
create policy ticket_escalations_select
on public.ticket_escalations
for select
to authenticated
using (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_escalations.ticket_id
  )
);

drop policy if exists ticket_escalations_insert on public.ticket_escalations;
create policy ticket_escalations_insert
on public.ticket_escalations
for insert
to authenticated
with check (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_escalations.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_escalations_update on public.ticket_escalations;
create policy ticket_escalations_update
on public.ticket_escalations
for update
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_escalations.ticket_id
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
    where t.id = ticket_escalations.ticket_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_escalations_delete on public.ticket_escalations;
create policy ticket_escalations_delete
on public.ticket_escalations
for delete
to authenticated
using (public.is_global_admin());

drop policy if exists ticket_escalation_events_select on public.ticket_escalation_events;
create policy ticket_escalation_events_select
on public.ticket_escalation_events
for select
to authenticated
using (
  exists(
    select 1
    from public.ticket_escalations e
    where e.id = ticket_escalation_events.ticket_escalation_id
      and exists(
        select 1
        from public.tickets t
        where t.id = e.ticket_id
      )
  )
);

drop policy if exists ticket_escalation_events_insert on public.ticket_escalation_events;
create policy ticket_escalation_events_insert
on public.ticket_escalation_events
for insert
to authenticated
with check (
  public.is_global_admin()
  or exists(
    select 1
    from public.ticket_escalations e
    join public.tickets t on t.id = e.ticket_id
    where e.id = ticket_escalation_events.ticket_escalation_id
      and (
        (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_escalation_events_delete on public.ticket_escalation_events;
create policy ticket_escalation_events_delete
on public.ticket_escalation_events
for delete
to authenticated
using (public.is_global_admin());

insert into public.oncall_schedules (schedule_key, name, description)
values
  ('default_it', 'Default IT On-Call', 'Default on-call schedule for IT')
on conflict (schedule_key) do nothing;

insert into public.escalation_policies (policy_key, name, description, priority, match_ticket_type)
values
  ('default_itsm_escalation', 'Default IT Escalation', 'Default escalation policy for IT tickets', 50, 'itsm_incident')
on conflict (policy_key) do nothing;
