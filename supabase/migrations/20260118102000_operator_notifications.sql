-- Add real-time notifications for operators when customers comment on tickets

-- Function to notify operators when customers comment
create or replace function public.notify_operators_on_customer_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket record;
  v_operator record;
begin
  -- Skip internal notes
  if new.is_internal = true then
    return new;
  end if;

  -- Get the ticket
  select * into v_ticket from public.tickets where id = new.ticket_id;
  
  if v_ticket is null then
    return new;
  end if;
  
  -- Only notify if comment is from the requester (customer reply)
  if new.author_id = v_ticket.requester_id then
    -- Notify the assignee if there is one
    if v_ticket.assignee_id is not null then
      insert into public.user_notifications (
        user_id,
        ticket_id,
        event_type,
        title,
        body,
        payload
      ) values (
        v_ticket.assignee_id,
        new.ticket_id,
        'customer_comment',
        'Customer replied to ticket',
        'Customer added a comment to ' || v_ticket.ticket_number || ': ' || v_ticket.title,
        jsonb_build_object(
          'ticket_id', new.ticket_id,
          'ticket_number', v_ticket.ticket_number,
          'comment_id', new.id,
          'author_id', new.author_id
        )
      );
    end if;
    
    -- Notify all operators in the assignment group
    for v_operator in 
      select oam.user_id 
      from public.operator_group_members oam
      join public.operator_groups og on og.id = oam.group_id
      where og.id = v_ticket.assignment_group_id
        and oam.user_id is distinct from v_ticket.assignee_id  -- Don't notify assignee twice
    loop
      insert into public.user_notifications (
        user_id,
        ticket_id,
        event_type,
        title,
        body,
        payload
      ) values (
        v_operator.user_id,
        new.ticket_id,
        'customer_comment',
        'Customer replied to ticket',
        'Customer added a comment to ' || v_ticket.ticket_number || ': ' || v_ticket.title,
        jsonb_build_object(
          'ticket_id', new.ticket_id,
          'ticket_number', v_ticket.ticket_number,
          'comment_id', new.id,
          'author_id', new.author_id
        )
      );
    end loop;
  end if;
  
  return new;
end;
$$;

-- Create trigger for customer comments
drop trigger if exists customer_comment_notification_trigger on public.ticket_comments;
create trigger customer_comment_notification_trigger
after insert on public.ticket_comments
for each row execute procedure public.notify_operators_on_customer_comment();
