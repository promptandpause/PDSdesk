-- Fix email reply-to address to use support@promptandpause.com for all customer service tickets
-- This ensures customers always reply to the same address and don't see agent emails

drop function if exists public.enqueue_ticket_notification(uuid, text, text);

create or replace function public.enqueue_ticket_notification(
  p_ticket_id uuid,
  p_event_type text, -- 'created', 'updated', 'resolved', 'closed'
  p_recipient_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket record;
  v_requester_email text;
  v_subject text;
  v_template_name text;
  v_template_data jsonb;
  v_email_queue_id uuid;
  v_reply_to text;
begin
  -- Get ticket details
  select * into v_ticket
  from public.tickets t
  left join public.profiles p on p.id = t.requester_id
  where t.id = p_ticket_id;
  
  if v_ticket is null then
    raise exception 'Ticket not found';
  end if;
  
  -- Determine recipient (default to requester)
  v_requester_email := coalesce(p_recipient_email, v_ticket.email);
  
  -- Check if user wants this notification
  if not public.wants_email_notification(v_ticket.requester_id, 'ticket_' || p_event_type) then
    return null;
  end if;
  
  -- For customer service tickets, always use support@promptandpause.com as reply-to
  if v_ticket.ticket_type = 'customer_service' then
    v_reply_to := 'support@promptandpause.com';
  else
    -- For other tickets, use unique reply address
    v_reply_to := 'servicedesk+' || v_ticket.ticket_number || '@promptandpause.com';
  end if;
  
  -- Set template and data based on event type
  case p_event_type
    when 'created' then
      v_template_name := 'ticket_created';
      v_subject := 'Ticket Created: ' || v_ticket.ticket_number || ' - ' || v_ticket.title;
      v_template_data := jsonb_build_object(
        'ticket_number', v_ticket.ticket_number,
        'title', v_ticket.title,
        'description', v_ticket.description,
        'status', v_ticket.status,
        'priority', v_ticket.priority,
        'created_at', v_ticket.created_at,
        'requester_name', coalesce(v_ticket.full_name, v_ticket.email)
      );
    when 'updated' then
      v_template_name := 'ticket_updated';
      v_subject := 'Ticket Updated: ' || v_ticket.ticket_number || ' - ' || v_ticket.title;
      v_template_data := jsonb_build_object(
        'ticket_number', v_ticket.ticket_number,
        'title', v_ticket.title,
        'status', v_ticket.status,
        'priority', v_ticket.priority,
        'updated_at', v_ticket.updated_at,
        'requester_name', coalesce(v_ticket.full_name, v_ticket.email)
      );
    when 'resolved' then
      v_template_name := 'ticket_resolved';
      v_subject := 'Ticket Resolved: ' || v_ticket.ticket_number || ' - ' || v_ticket.title;
      v_template_data := jsonb_build_object(
        'ticket_number', v_ticket.ticket_number,
        'title', v_ticket.title,
        'status', v_ticket.status,
        'priority', v_ticket.priority,
        'resolved_at', v_ticket.updated_at,
        'requester_name', coalesce(v_ticket.full_name, v_ticket.email)
      );
    when 'closed' then
      v_template_name := 'ticket_closed';
      v_subject := 'Ticket Closed: ' || v_ticket.ticket_number || ' - ' || v_ticket.title;
      v_template_data := jsonb_build_object(
        'ticket_number', v_ticket.ticket_number,
        'title', v_ticket.title,
        'status', v_ticket.status,
        'priority', v_ticket.priority,
        'closed_at', v_ticket.updated_at,
        'requester_name', coalesce(v_ticket.full_name, v_ticket.email)
      );
    else
      raise exception 'Invalid event type: ' || p_event_type;
  end case;
  
  -- Insert into email queue
  insert into public.email_queue (
    to_email,
    subject,
    template_name,
    template_data,
    reply_to,
    priority
  ) values (
    v_requester_email,
    v_subject,
    v_template_name,
    v_template_data,
    v_reply_to,
    3 -- Higher priority for ticket notifications
  )
  returning id into v_email_queue_id;
  
  return v_email_queue_id;
end;
$$;

grant execute on function public.enqueue_ticket_notification(uuid, text, text) to authenticated;
