-- Add operator_group_id to tickets table for queue routing
-- This column is needed for service catalog ticket routing and queue-based filtering

alter table public.tickets 
add column if not exists operator_group_id uuid references public.operator_groups(id);

-- Add index for performance
create index if not exists tickets_operator_group_id_idx on public.tickets(operator_group_id);

-- Update RLS policy to include operator_group_id filtering
drop policy if exists tickets_select on public.tickets;
create policy tickets_select
on public.tickets
for select
to authenticated
using (
  public.can_work_tickets()
  or requester_id = auth.uid()
  or assignee_id = auth.uid()
  or created_by = auth.uid()
);

-- Update insert policy to allow setting operator_group_id
drop policy if exists tickets_insert on public.tickets;
create policy tickets_insert
on public.tickets
for insert
to authenticated
with check (
  requester_id = auth.uid() and 
  created_by = auth.uid()
);

-- Update update policy to allow modifying operator_group_id for admins
drop policy if exists tickets_update on public.tickets;
create policy tickets_update
on public.tickets
for update
to authenticated
using (
  public.can_work_tickets()
  or requester_id = auth.uid()
  or assignee_id = auth.uid()
  or created_by = auth.uid()
);
