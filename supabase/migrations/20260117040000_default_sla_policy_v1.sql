-- Add a catch-all default SLA policy to ensure all tickets get SLA applied
-- This policy has the lowest priority (highest number) so specific policies take precedence

INSERT INTO public.sla_policies (policy_key, name, description, priority, first_response_minutes, resolution_minutes)
VALUES (
  'default_all_tickets',
  'Default SLA - All Tickets',
  'Catch-all SLA policy applied to any ticket that does not match a more specific policy',
  1000,  -- Low priority (high number = evaluated last)
  480,   -- 8 hours first response
  2880   -- 48 hours resolution
)
ON CONFLICT (policy_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  priority = EXCLUDED.priority,
  first_response_minutes = EXCLUDED.first_response_minutes,
  resolution_minutes = EXCLUDED.resolution_minutes;

-- Also add priority-based SLA policies for better coverage
INSERT INTO public.sla_policies (policy_key, name, description, priority, match_priority, first_response_minutes, resolution_minutes)
VALUES 
  ('priority_critical', 'Critical Priority SLA', 'SLA for critical priority tickets', 10, 'critical', 30, 240),
  ('priority_high', 'High Priority SLA', 'SLA for high priority tickets', 20, 'high', 60, 480),
  ('priority_medium', 'Medium Priority SLA', 'SLA for medium priority tickets', 30, 'medium', 240, 1440),
  ('priority_low', 'Low Priority SLA', 'SLA for low priority tickets', 40, 'low', 480, 2880)
ON CONFLICT (policy_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  priority = EXCLUDED.priority,
  match_priority = EXCLUDED.match_priority,
  first_response_minutes = EXCLUDED.first_response_minutes,
  resolution_minutes = EXCLUDED.resolution_minutes;
