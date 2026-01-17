-- Create a function to notify watchers when ticket events occur
-- This creates notifications for all watchers of a ticket when:
-- 1. A comment is added
-- 2. Ticket status changes
-- 3. Ticket is assigned/reassigned

-- Function to notify watchers on ticket comment
create or replace function public.notify_watchers_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket record;
  v_watcher record;
  v_actor_name text;
begin
  -- Get ticket info
  select t.id, t.ticket_number, t.title
  into v_ticket
  from public.tickets t
  where t.id = new.ticket_id;

  if v_ticket is null then
    return new;
  end if;

  -- Get actor name
  select coalesce(p.full_name, p.email, 'Someone')
  into v_actor_name
  from public.profiles p
  where p.id = new.author_id;

  -- Notify all watchers except the comment author
  for v_watcher in
    select tw.user_id
    from public.ticket_watchers tw
    where tw.ticket_id = new.ticket_id
      and tw.user_id <> new.author_id
  loop
    insert into public.user_notifications (user_id, ticket_id, event_type, title, body, payload)
    values (
      v_watcher.user_id,
      new.ticket_id,
      'ticket_comment',
      'New comment on ' || v_ticket.ticket_number,
      v_actor_name || ' commented: ' || left(new.body, 100),
      jsonb_build_object(
        'ticket_id', new.ticket_id,
        'ticket_number', v_ticket.ticket_number,
        'comment_id', new.id,
        'author_id', new.author_id,
        'is_internal', new.is_internal
      )
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists notify_watchers_on_comment_trigger on public.ticket_comments;
create trigger notify_watchers_on_comment_trigger
after insert on public.ticket_comments
for each row execute procedure public.notify_watchers_on_comment();

-- Function to notify watchers on ticket status change
create or replace function public.notify_watchers_on_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_watcher record;
begin
  -- Only trigger on status change
  if old.status = new.status then
    return new;
  end if;

  -- Notify all watchers
  for v_watcher in
    select tw.user_id
    from public.ticket_watchers tw
    where tw.ticket_id = new.id
  loop
    insert into public.user_notifications (user_id, ticket_id, event_type, title, body, payload)
    values (
      v_watcher.user_id,
      new.id,
      'ticket_status_changed',
      'Status changed on ' || new.ticket_number,
      'Status changed from ' || old.status || ' to ' || new.status,
      jsonb_build_object(
        'ticket_id', new.id,
        'ticket_number', new.ticket_number,
        'old_status', old.status,
        'new_status', new.status
      )
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists notify_watchers_on_status_change_trigger on public.tickets;
create trigger notify_watchers_on_status_change_trigger
after update on public.tickets
for each row execute procedure public.notify_watchers_on_status_change();

-- Function to notify watchers on ticket assignment change
create or replace function public.notify_watchers_on_assignment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_watcher record;
  v_assignee_name text;
begin
  -- Only trigger on assignee change
  if old.assignee_id is not distinct from new.assignee_id then
    return new;
  end if;

  -- Get new assignee name
  if new.assignee_id is not null then
    select coalesce(p.full_name, p.email, 'Someone')
    into v_assignee_name
    from public.profiles p
    where p.id = new.assignee_id;
  else
    v_assignee_name := 'Unassigned';
  end if;

  -- Notify all watchers
  for v_watcher in
    select tw.user_id
    from public.ticket_watchers tw
    where tw.ticket_id = new.id
      and tw.user_id <> coalesce(new.assignee_id, '00000000-0000-0000-0000-000000000000')
  loop
    insert into public.user_notifications (user_id, ticket_id, event_type, title, body, payload)
    values (
      v_watcher.user_id,
      new.id,
      'ticket_assigned',
      'Assignment changed on ' || new.ticket_number,
      'Ticket assigned to ' || v_assignee_name,
      jsonb_build_object(
        'ticket_id', new.id,
        'ticket_number', new.ticket_number,
        'old_assignee_id', old.assignee_id,
        'new_assignee_id', new.assignee_id,
        'assignee_name', v_assignee_name
      )
    );
  end loop;

  -- Also notify the new assignee if they're not already a watcher
  if new.assignee_id is not null then
    insert into public.user_notifications (user_id, ticket_id, event_type, title, body, payload)
    select 
      new.assignee_id,
      new.id,
      'ticket_assigned_to_you',
      'Ticket ' || new.ticket_number || ' assigned to you',
      new.title,
      jsonb_build_object(
        'ticket_id', new.id,
        'ticket_number', new.ticket_number,
        'title', new.title
      )
    where not exists (
      select 1 from public.user_notifications un
      where un.user_id = new.assignee_id
        and un.ticket_id = new.id
        and un.event_type = 'ticket_assigned_to_you'
        and un.created_at > now() - interval '1 minute'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notify_watchers_on_assignment_change_trigger on public.tickets;
create trigger notify_watchers_on_assignment_change_trigger
after update on public.tickets
for each row execute procedure public.notify_watchers_on_assignment_change();

-- Allow system to insert notifications (for triggers)
drop policy if exists user_notifications_insert_system on public.user_notifications;
create policy user_notifications_insert_system
on public.user_notifications
for insert
to authenticated
with check (true);
