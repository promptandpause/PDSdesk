-- Operator groups and Customer Service ticket segregation

create extension if not exists pgcrypto;

create table if not exists public.operator_groups (
  id uuid primary key default gen_random_uuid(),
  group_key text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.operator_group_members (
  group_id uuid not null references public.operator_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists operator_group_members_user_id_idx on public.operator_group_members (user_id);

create or replace function public.is_in_operator_group(required_group_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.operator_group_members ogm
    join public.operator_groups og on og.id = ogm.group_id
    where ogm.user_id = auth.uid()
      and og.group_key = required_group_key
      and og.is_active = true
  );
$$;

-- Seed standard groups
insert into public.operator_groups (group_key, name, description)
values
  ('customer_service', 'Customer Service', 'Handles support@promptandpause.com inquiries and customer requests'),
  ('it_services', 'IT Services', 'Handles internal IT incidents and requests')
on conflict (group_key) do nothing;

alter table public.operator_groups enable row level security;
alter table public.operator_group_members enable row level security;

drop policy if exists operator_groups_select_authenticated on public.operator_groups;
create policy operator_groups_select_authenticated
on public.operator_groups
for select
to authenticated
using (true);

drop policy if exists operator_groups_admin_write on public.operator_groups;
create policy operator_groups_admin_write
on public.operator_groups
for all
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

drop policy if exists operator_group_members_select on public.operator_group_members;
create policy operator_group_members_select
on public.operator_group_members
for select
to authenticated
using (user_id = auth.uid() or public.is_global_admin());

drop policy if exists operator_group_members_admin_write on public.operator_group_members;
create policy operator_group_members_admin_write
on public.operator_group_members
for all
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

-- Ticket classification
alter table public.tickets
  add column if not exists ticket_type text not null default 'itsm_incident';

alter table public.tickets
  add column if not exists channel text not null default 'manual';

alter table public.tickets
  add column if not exists mailbox text;

alter table public.tickets
  add column if not exists assignment_group_id uuid references public.operator_groups(id) on delete set null;

create index if not exists tickets_ticket_type_idx on public.tickets (ticket_type);
create index if not exists tickets_assignment_group_id_idx on public.tickets (assignment_group_id);

create or replace function public.tickets_set_assignment_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.ticket_type = 'customer_service' then
    if new.assignment_group_id is null then
      select og.id into new.assignment_group_id
      from public.operator_groups og
      where og.group_key = 'customer_service'
        and og.is_active = true
      limit 1;
    end if;

    if new.mailbox is null or new.mailbox = '' then
      new.mailbox := 'support@promptandpause.com';
    end if;

    if new.channel is null or new.channel = '' then
      new.channel := 'email';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tickets_set_assignment_defaults on public.tickets;
create trigger tickets_set_assignment_defaults
before insert on public.tickets
for each row execute procedure public.tickets_set_assignment_defaults();

-- Update RLS to enforce Customer Service segregation
-- For customer_service tickets: only Customer Service group, assignee, requester/creator, or global admin
-- For other tickets: existing behavior for workers (can_work_tickets) and participants

drop policy if exists tickets_select on public.tickets;
create policy tickets_select
on public.tickets
for select
to authenticated
using (
  public.is_global_admin()
  or requester_id = auth.uid()
  or assignee_id = auth.uid()
  or created_by = auth.uid()
  or (
    ticket_type <> 'customer_service'
    and public.can_work_tickets()
  )
  or (
    ticket_type = 'customer_service'
    and public.is_in_operator_group('customer_service')
  )
);

-- inserts: requesters can create their own; workers can create for others; CS group can create CS tickets
-- (email ingestion will use service role and bypass RLS)

drop policy if exists tickets_insert on public.tickets;
create policy tickets_insert
on public.tickets
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    requester_id = auth.uid()
    or public.can_work_tickets()
    or (
      ticket_type = 'customer_service'
      and public.is_in_operator_group('customer_service')
    )
  )
);

drop policy if exists tickets_update on public.tickets;
create policy tickets_update
on public.tickets
for update
to authenticated
using (
  public.is_global_admin()
  or (
    ticket_type <> 'customer_service'
    and public.can_work_tickets()
  )
  or (
    ticket_type = 'customer_service'
    and public.is_in_operator_group('customer_service')
  )
  or assignee_id = auth.uid()
)
with check (
  public.is_global_admin()
  or (
    ticket_type <> 'customer_service'
    and public.can_work_tickets()
  )
  or (
    ticket_type = 'customer_service'
    and public.is_in_operator_group('customer_service')
  )
  or assignee_id = auth.uid()
);

-- ticket_comments RLS: allow worker groups (service desk operators or customer service group) to see internal notes.
-- Participants can see only non-internal comments.

drop policy if exists ticket_comments_select on public.ticket_comments;
create policy ticket_comments_select
on public.ticket_comments
for select
to authenticated
using (
  public.is_global_admin()
  or public.can_work_tickets()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_comments.ticket_id
      and t.ticket_type = 'customer_service'
      and public.is_in_operator_group('customer_service')
  )
  or (
    is_internal = false
    and exists(
      select 1
      from public.tickets t
      where t.id = ticket_comments.ticket_id
        and (
          t.requester_id = auth.uid()
          or t.assignee_id = auth.uid()
          or t.created_by = auth.uid()
        )
    )
  )
);

-- ticket_comments insert: allow workers to post internal/external; participants only external

drop policy if exists ticket_comments_insert on public.ticket_comments;
create policy ticket_comments_insert
on public.ticket_comments
for insert
to authenticated
with check (
  author_id = auth.uid()
  and (
    public.is_global_admin()
    or public.can_work_tickets()
    or (
      exists(
        select 1
        from public.tickets t
        where t.id = ticket_comments.ticket_id
          and t.ticket_type = 'customer_service'
          and public.is_in_operator_group('customer_service')
      )
    )
    or (
      is_internal = false
      and exists(
        select 1
        from public.tickets t
        where t.id = ticket_comments.ticket_id
          and (
            t.requester_id = auth.uid()
            or t.created_by = auth.uid()
          )
      )
    )
  )
);
