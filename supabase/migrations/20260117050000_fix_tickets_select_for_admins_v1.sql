-- Fix tickets_select policy to allow service_desk_admin to see ALL tickets
-- Previously, service_desk_admin could only see non-customer_service tickets via can_work_tickets()
-- Now we explicitly allow service_desk_admin to see all tickets like global_admin

drop policy if exists tickets_select on public.tickets;
create policy tickets_select
on public.tickets
for select
to authenticated
using (
  public.is_global_admin()
  or public.has_role('service_desk_admin')
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

-- Also fix tickets_delete policy to allow service_desk_admin to delete any non-closed ticket
drop policy if exists tickets_delete on public.tickets;
create policy tickets_delete
on public.tickets
for delete
to authenticated
using (
  status <> 'closed'
  and (
    public.is_global_admin()
    or public.has_role('service_desk_admin')
    or (ticket_type <> 'customer_service' and public.can_work_tickets())
  )
);
