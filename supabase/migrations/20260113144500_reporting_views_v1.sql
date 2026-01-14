create or replace view public.v_ticket_sla_overview as
select
  t.id as ticket_id,
  t.ticket_number,
  t.ticket_type,
  t.status,
  t.priority,
  t.category,
  t.assignment_group_id,
  s.sla_policy_id,
  s.first_response_due_at,
  s.resolution_due_at,
  s.first_response_breached,
  s.resolution_breached
from public.tickets t
left join public.ticket_slas s on s.ticket_id = t.id;

grant select on public.v_ticket_sla_overview to authenticated;

create or replace view public.v_ticket_counts_by_status as
select
  t.ticket_type,
  t.status,
  count(*)::bigint as ticket_count
from public.tickets t
group by t.ticket_type, t.status;

grant select on public.v_ticket_counts_by_status to authenticated;

create or replace view public.v_ticket_counts_by_group_status as
select
  t.assignment_group_id,
  t.status,
  count(*)::bigint as ticket_count
from public.tickets t
group by t.assignment_group_id, t.status;

grant select on public.v_ticket_counts_by_group_status to authenticated;
