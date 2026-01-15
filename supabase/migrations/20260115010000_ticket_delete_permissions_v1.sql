drop policy if exists tickets_delete on public.tickets;
create policy tickets_delete
on public.tickets
for delete
to authenticated
using (
  public.is_global_admin()
  or (ticket_type <> 'customer_service' and public.can_work_tickets())
);

drop policy if exists ticket_events_delete on public.ticket_events;
create policy ticket_events_delete
on public.ticket_events
for delete
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_events.ticket_id
      and t.ticket_type <> 'customer_service'
      and public.can_work_tickets()
  )
);

drop policy if exists ticket_comments_delete on public.ticket_comments;
create policy ticket_comments_delete
on public.ticket_comments
for delete
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_comments.ticket_id
      and t.ticket_type <> 'customer_service'
      and public.can_work_tickets()
  )
);

drop policy if exists ticket_attachments_delete on public.ticket_attachments;
create policy ticket_attachments_delete
on public.ticket_attachments
for delete
to authenticated
using (
  public.is_global_admin()
  or uploader_id = auth.uid()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_attachments.ticket_id
      and t.ticket_type <> 'customer_service'
      and public.can_work_tickets()
  )
);

drop policy if exists ticket_tasks_delete on public.ticket_tasks;
create policy ticket_tasks_delete
on public.ticket_tasks
for delete
to authenticated
using (
  public.is_global_admin()
  or created_by = auth.uid()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_tasks.ticket_id
      and t.ticket_type <> 'customer_service'
      and public.can_work_tickets()
  )
);

drop policy if exists ticket_watchers_delete on public.ticket_watchers;
create policy ticket_watchers_delete
on public.ticket_watchers
for delete
to authenticated
using (
  (user_id = auth.uid() and exists(select 1 from public.tickets t where t.id = ticket_watchers.ticket_id))
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_watchers.ticket_id
      and t.ticket_type <> 'customer_service'
      and public.can_work_tickets()
  )
);

drop policy if exists ticket_sla_events_delete on public.ticket_sla_events;
create policy ticket_sla_events_delete
on public.ticket_sla_events
for delete
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_sla_events.ticket_id
      and t.ticket_type <> 'customer_service'
      and public.can_work_tickets()
  )
);

drop policy if exists ticket_time_entries_delete on public.ticket_time_entries;
create policy ticket_time_entries_delete
on public.ticket_time_entries
for delete
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_time_entries.ticket_id
      and t.ticket_type <> 'customer_service'
      and public.can_work_tickets()
  )
);

drop policy if exists ticket_escalations_delete on public.ticket_escalations;
create policy ticket_escalations_delete
on public.ticket_escalations
for delete
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_escalations.ticket_id
      and t.ticket_type <> 'customer_service'
      and public.can_work_tickets()
  )
);

drop policy if exists ticket_escalation_events_delete on public.ticket_escalation_events;
create policy ticket_escalation_events_delete
on public.ticket_escalation_events
for delete
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.ticket_escalations e
    join public.tickets t on t.id = e.ticket_id
    where e.id = ticket_escalation_events.ticket_escalation_id
      and t.ticket_type <> 'customer_service'
      and public.can_work_tickets()
  )
);

drop policy if exists ticket_approval_requests_delete on public.ticket_approval_requests;
create policy ticket_approval_requests_delete
on public.ticket_approval_requests
for delete
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_approval_requests.ticket_id
      and t.ticket_type <> 'customer_service'
      and public.can_work_tickets()
  )
);

drop policy if exists ticket_approval_decisions_delete on public.ticket_approval_decisions;
create policy ticket_approval_decisions_delete
on public.ticket_approval_decisions
for delete
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.ticket_approval_requests r
    join public.tickets t on t.id = r.ticket_id
    where r.id = ticket_approval_decisions.request_id
      and t.ticket_type <> 'customer_service'
      and public.can_work_tickets()
  )
);

drop policy if exists ticket_service_request_items_delete on public.ticket_service_request_items;
create policy ticket_service_request_items_delete
on public.ticket_service_request_items
for delete
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_service_request_items.ticket_id
      and t.ticket_type <> 'customer_service'
      and public.can_work_tickets()
  )
);

drop policy if exists ticket_service_request_item_values_delete on public.ticket_service_request_item_values;
create policy ticket_service_request_item_values_delete
on public.ticket_service_request_item_values
for delete
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_service_request_item_values.ticket_id
      and t.ticket_type <> 'customer_service'
      and public.can_work_tickets()
  )
);

drop policy if exists ticket_customer_satisfaction_delete on public.ticket_customer_satisfaction;
create policy ticket_customer_satisfaction_delete
on public.ticket_customer_satisfaction
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_global_admin()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_customer_satisfaction.ticket_id
      and t.ticket_type <> 'customer_service'
      and public.can_work_tickets()
  )
);

drop policy if exists notification_subscriptions_delete on public.notification_subscriptions;
create policy notification_subscriptions_delete
on public.notification_subscriptions
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_global_admin()
  or (
    ticket_id is not null
    and exists(
      select 1
      from public.tickets t
      where t.id = notification_subscriptions.ticket_id
        and t.ticket_type <> 'customer_service'
        and public.can_work_tickets()
    )
  )
);
