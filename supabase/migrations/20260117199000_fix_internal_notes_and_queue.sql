-- Fix: Internal notes should NOT trigger notifications or status changes
-- Fix: Ensure servicedesk-queue group exists

-- 1. Fix the comment notification trigger to skip internal notes
create or replace function public.ticket_comment_notification_handler()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket record;
begin
  -- Skip internal notes - they should NOT notify the requester
  if new.is_internal = true then
    return new;
  end if;

  -- Get the ticket
  select * into v_ticket from public.tickets where id = new.ticket_id;
  
  if v_ticket is null then
    return new;
  end if;
  
  -- Only notify if the comment is NOT from the requester (i.e., from an agent)
  -- and the comment is NOT internal
  if new.author_id is distinct from v_ticket.requester_id then
    perform public.enqueue_ticket_notification(new.ticket_id, 'updated');
  end if;
  
  return new;
end;
$$;

-- 2. Ensure default operator groups exist including servicedesk-queue
insert into public.operator_groups (group_key, name, description, is_active)
values 
  ('servicedesk-queue', 'Service Desk', 'First-line IT support queue', true),
  ('incident-queue', 'Incident Management', 'Incident management queue', true),
  ('problem-queue', 'Problem Management', 'Problem management queue', true),
  ('change-queue', 'Change Management', 'Change management queue', true)
on conflict (group_key) do nothing;
