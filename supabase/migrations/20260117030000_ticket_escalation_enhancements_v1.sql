-- Ticket escalation tracking and queue enhancements

-- Add escalation fields to tickets
alter table public.tickets
  add column if not exists escalation_level integer not null default 0,
  add column if not exists escalated_at timestamptz,
  add column if not exists escalated_by uuid references public.profiles(id) on delete set null,
  add column if not exists escalation_reason text,
  add column if not exists previous_group_id uuid references public.operator_groups(id) on delete set null;

-- Create ticket_escalation_history table for audit trail
create table if not exists public.ticket_escalation_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  from_group_id uuid references public.operator_groups(id) on delete set null,
  to_group_id uuid references public.operator_groups(id) on delete set null,
  from_assignee_id uuid references public.profiles(id) on delete set null,
  to_assignee_id uuid references public.profiles(id) on delete set null,
  escalation_type text not null check (escalation_type in ('escalate', 'de_escalate', 'transfer')),
  reason text,
  performed_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists ticket_escalation_history_ticket_id_idx on public.ticket_escalation_history (ticket_id);

alter table public.ticket_escalation_history enable row level security;

drop policy if exists ticket_escalation_history_select on public.ticket_escalation_history;
create policy ticket_escalation_history_select
on public.ticket_escalation_history
for select
to authenticated
using (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_escalation_history.ticket_id
  )
);

drop policy if exists ticket_escalation_history_insert on public.ticket_escalation_history;
create policy ticket_escalation_history_insert
on public.ticket_escalation_history
for insert
to authenticated
with check (
  performed_by = auth.uid()
  and (public.can_work_tickets() or public.is_global_admin())
);

-- Update operator_groups to ensure service_desk is the main queue
update public.operator_groups
set group_key = 'servicedesk-queue', name = 'Service Desk'
where group_key = 'it_services';

update public.operator_groups
set group_key = 'customerservice-queue', name = 'Customer Service'
where group_key = 'customer_service';

-- Function to get user's visible queues
create or replace function public.get_user_visible_queues()
returns table (
  id uuid,
  group_key text,
  name text,
  description text,
  is_active boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select og.id, og.group_key, og.name, og.description, og.is_active
  from public.operator_groups og
  where og.is_active = true
    and (
      public.is_global_admin()
      or public.has_role('service_desk_admin')
      or exists(
        select 1
        from public.operator_group_members ogm
        where ogm.group_id = og.id
          and ogm.user_id = auth.uid()
      )
    )
  order by og.name;
$$;

-- Function to escalate ticket
create or replace function public.escalate_ticket(
  p_ticket_id uuid,
  p_to_group_id uuid,
  p_to_assignee_id uuid default null,
  p_reason text default null,
  p_escalation_type text default 'escalate'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket record;
  v_result json;
begin
  -- Get current ticket state
  select * into v_ticket from public.tickets where id = p_ticket_id;
  
  if not found then
    return json_build_object('ok', false, 'error', 'Ticket not found');
  end if;

  -- Record escalation history
  insert into public.ticket_escalation_history (
    ticket_id,
    from_group_id,
    to_group_id,
    from_assignee_id,
    to_assignee_id,
    escalation_type,
    reason,
    performed_by
  ) values (
    p_ticket_id,
    v_ticket.assignment_group_id,
    p_to_group_id,
    v_ticket.assignee_id,
    p_to_assignee_id,
    p_escalation_type,
    p_reason,
    auth.uid()
  );

  -- Update ticket
  update public.tickets
  set
    previous_group_id = assignment_group_id,
    assignment_group_id = p_to_group_id,
    assignee_id = p_to_assignee_id,
    escalation_level = case 
      when p_escalation_type = 'escalate' then escalation_level + 1
      when p_escalation_type = 'de_escalate' then greatest(0, escalation_level - 1)
      else escalation_level
    end,
    escalated_at = now(),
    escalated_by = auth.uid(),
    escalation_reason = p_reason,
    updated_at = now()
  where id = p_ticket_id;

  return json_build_object('ok', true);
end;
$$;
