-- Fix ticket_slas RLS policy to be more permissive
-- The existing policy might be too restrictive causing 400 errors

drop policy if exists ticket_slas_select on public.ticket_slas;
create policy ticket_slas_select
on public.ticket_slas
for select
to authenticated
using (
  public.is_global_admin()
  or public.can_work_tickets()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_slas.ticket_id
      and (
        t.requester_id = auth.uid()
        or t.assignee_id = auth.uid()
        or t.created_by = auth.uid()
      )
  )
);

-- Update insert policy
drop policy if exists ticket_slas_insert on public.ticket_slas;
create policy ticket_slas_insert
on public.ticket_slas
for insert
to authenticated
with check (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_slas.ticket_id
      and (
        t.requester_id = auth.uid()
        or t.assignee_id = auth.uid()
        or t.created_by = auth.uid()
      )
  )
);

-- Update update policy
drop policy if exists ticket_slas_update on public.ticket_slas;
create policy ticket_slas_update
on public.ticket_slas
for update
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_slas.ticket_id
      and (
        t.requester_id = auth.uid()
        or t.assignee_id = auth.uid()
        or t.created_by = auth.uid()
      )
  )
)
with check (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_slas.ticket_id
      and (
        t.requester_id = auth.uid()
        or t.assignee_id = auth.uid()
        or t.created_by = auth.uid()
      )
  )
);

-- Update delete policy
drop policy if exists ticket_slas_delete on public.ticket_slas;
create policy ticket_slas_delete
on public.ticket_slas
for delete
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_slas.ticket_id
      and (
        t.requester_id = auth.uid()
        or t.assignee_id = auth.uid()
        or t.created_by = auth.uid()
      )
  )
);
