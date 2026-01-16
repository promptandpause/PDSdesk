drop policy if exists tickets_delete on public.tickets;
create policy tickets_delete
on public.tickets
for delete
to authenticated
using (
  status <> 'closed'
  and (
    public.is_global_admin()
    or (ticket_type <> 'customer_service' and public.can_work_tickets())
  )
);
