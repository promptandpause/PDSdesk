-- Fix notification triggers to only fire on meaningful changes
-- Problem: triggers were firing on every update (including updated_at changes)

-- Drop existing problematic triggers
drop trigger if exists ticket_updated_notification_trigger on public.tickets;
drop trigger if exists ticket_status_change_notification_trigger on public.tickets;

-- Remove the generic "updated" notification handler - it fires too often
-- Updates should only trigger notifications when:
-- 1. Status changes (resolved, closed) - handled by status_change trigger
-- 2. A comment is added - handled by comment trigger

-- Fix the status change handler to ONLY handle resolved/closed
create or replace function public.handle_ticket_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only notify on specific status changes
  if new.status is distinct from old.status then
    case new.status
      when 'resolved' then
        perform public.enqueue_ticket_notification(new.id, 'resolved');
      when 'closed' then
        perform public.enqueue_ticket_notification(new.id, 'closed');
      else
        -- Don't send notification for other status changes (open, in_progress, etc.)
        null;
    end case;
  end if;
  
  return new;
end;
$$;

-- Re-create status change trigger (only fires on actual status change)
create trigger ticket_status_change_notification_trigger
after update on public.tickets
for each row
when (old.status is distinct from new.status)
execute procedure public.handle_ticket_status_change();

-- Create a trigger for ticket comments to notify requester of updates
create or replace function public.ticket_comment_notification_handler()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket record;
  v_commenter_id uuid;
begin
  -- Get the ticket and check if comment is from someone other than requester
  select * into v_ticket from public.tickets where id = new.ticket_id;
  
  if v_ticket is null then
    return new;
  end if;
  
  -- Only notify if the comment is NOT from the requester (i.e., from an agent)
  if new.author_id is distinct from v_ticket.requester_id then
    perform public.enqueue_ticket_notification(new.ticket_id, 'updated');
  end if;
  
  return new;
end;
$$;

-- Create trigger for comments (only fires once per comment)
drop trigger if exists ticket_comment_notification_trigger on public.ticket_comments;
create trigger ticket_comment_notification_trigger
after insert on public.ticket_comments
for each row
execute procedure public.ticket_comment_notification_handler();
