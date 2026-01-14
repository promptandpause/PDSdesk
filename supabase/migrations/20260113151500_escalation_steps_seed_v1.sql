insert into public.escalation_policy_steps (policy_id, step_order, delay_minutes, notify_group_id, notify_channel)
select
  p.id,
  1,
  0,
  og.id,
  'in_app'
from public.escalation_policies p
join public.operator_groups og on og.group_key = 'it_services'
where p.policy_key = 'default_itsm_escalation'
on conflict (policy_id, step_order) do nothing;

insert into public.escalation_policy_steps (policy_id, step_order, delay_minutes, notify_group_id, notify_channel)
select
  p.id,
  2,
  60,
  og.id,
  'in_app'
from public.escalation_policies p
join public.operator_groups og on og.group_key = 'it_services'
where p.policy_key = 'default_itsm_escalation'
on conflict (policy_id, step_order) do nothing;
