insert into public.ticket_routing_rules (rule_key, priority, match_ticket_type, assignment_group_id)
select
  'customer_service_default',
  20,
  'customer_service',
  og.id
from public.operator_groups og
where og.group_key = 'customer_service'
on conflict (rule_key) do nothing;
