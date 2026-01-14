
 create extension if not exists pgcrypto;

 create or replace function public.tickets_auto_in_progress_on_update()
 returns trigger
 language plpgsql
 security definer
 set search_path = public
 as $$
 declare
   is_agent boolean;
   has_meaningful_change boolean;
 begin
   -- Only act when the agent did NOT explicitly change status.
   if new.status is distinct from old.status then
     return new;
   end if;

   if old.status not in ('new', 'open', 'pending') then
     return new;
   end if;

   is_agent := public.is_global_admin() or public.can_work_tickets() or new.assignee_id = auth.uid();
   if not is_agent and new.ticket_type = 'customer_service' then
     is_agent := public.is_in_operator_group('customer_service');
   end if;

   if not is_agent then
     return new;
   end if;

   -- If the update doesn't actually change any meaningful ticket fields,
   -- don't auto-advance status.
   has_meaningful_change :=
     row(
       new.title,
       new.description,
       new.priority,
       new.category,
       new.due_at,
       new.external_number,
       new.assignment_group_id,
       new.assignee_id,
       new.mailbox,
       new.channel
     ) is distinct from row(
       old.title,
       old.description,
       old.priority,
       old.category,
       old.due_at,
       old.external_number,
       old.assignment_group_id,
       old.assignee_id,
       old.mailbox,
       old.channel
     );

   if not has_meaningful_change then
     return new;
   end if;

   new.status := 'in_progress';

   insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
   values (
     new.id,
     auth.uid(),
     'ticket_status_changed',
     jsonb_build_object('from', old.status::text, 'to', 'in_progress', 'reason', 'agent_update')
   );

   return new;
 end;
 $$;

 drop trigger if exists tickets_y_auto_in_progress_on_update on public.tickets;
 create trigger tickets_y_auto_in_progress_on_update
 before update
 on public.tickets
 for each row
 execute procedure public.tickets_auto_in_progress_on_update();

 drop policy if exists ticket_events_insert on public.ticket_events;
 create policy ticket_events_insert
 on public.ticket_events
 for insert
 to authenticated
 with check (
   actor_id = auth.uid()
   and (
     public.is_global_admin()
     or public.can_work_tickets()
     or exists(
       select 1
       from public.tickets t
       where t.id = ticket_id
         and (
           t.assignee_id = auth.uid()
           or (
             t.ticket_type = 'customer_service'
             and public.is_in_operator_group('customer_service')
           )
         )
     )
   )
 );

