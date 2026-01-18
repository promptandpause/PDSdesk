-- Fix reply-to for customer service tickets only

-- Update the function to use different reply-to based on ticket type
CREATE OR REPLACE FUNCTION public.enqueue_ticket_notification(
  p_ticket_id UUID,
  p_event_type TEXT,
  p_recipient_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
  v_requester_email TEXT;
  v_subject TEXT;
  v_template_name TEXT;
  v_template_data JSONB;
  v_email_queue_id UUID;
  v_reply_to TEXT;
BEGIN
  SELECT * INTO v_ticket
  FROM public.tickets t
  LEFT JOIN public.profiles p ON p.id = t.requester_id
  WHERE t.id = p_ticket_id;
  
  IF v_ticket IS NULL THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;
  
  v_requester_email := COALESCE(p_recipient_email, v_ticket.email);
  
  IF NOT public.wants_email_notification(v_ticket.requester_id, 'ticket_' || p_event_type) THEN
    RETURN NULL;
  END IF;
  
  -- Customer service tickets use support@promptandpause.com
  IF v_ticket.ticket_type = 'customer_service' THEN
    v_reply_to := 'support@promptandpause.com';
  ELSE
    v_reply_to := 'servicedesk+' || v_ticket.ticket_number || '@promptandpause.com';
  END IF;
  
  CASE p_event_type
    WHEN 'created' THEN
      v_template_name := 'ticket_created';
      v_subject := 'Ticket Created: ' || v_ticket.ticket_number || ' - ' || v_ticket.title;
      v_template_data := JSONB_BUILD_OBJECT(
        'ticket_number', v_ticket.ticket_number,
        'title', v_ticket.title,
        'description', v_ticket.description,
        'status', v_ticket.status,
        'priority', v_ticket.priority,
        'created_at', v_ticket.created_at,
        'requester_name', COALESCE(v_ticket.full_name, v_ticket.email)
      );
    WHEN 'updated' THEN
      v_template_name := 'ticket_updated';
      v_subject := 'Ticket Updated: ' || v_ticket.ticket_number || ' - ' || v_ticket.title;
      v_template_data := JSONB_BUILD_OBJECT(
        'ticket_number', v_ticket.ticket_number,
        'title', v_ticket.title,
        'status', v_ticket.status,
        'priority', v_ticket.priority,
        'updated_at', v_ticket.updated_at,
        'requester_name', COALESCE(v_ticket.full_name, v_ticket.email)
      );
    WHEN 'resolved' THEN
      v_template_name := 'ticket_resolved';
      v_subject := 'Ticket Resolved: ' || v_ticket.ticket_number || ' - ' || v_ticket.title;
      v_template_data := JSONB_BUILD_OBJECT(
        'ticket_number', v_ticket.ticket_number,
        'title', v_ticket.title,
        'status', v_ticket.status,
        'priority', v_ticket.priority,
        'resolved_at', v_ticket.updated_at,
        'requester_name', COALESCE(v_ticket.full_name, v_ticket.email)
      );
    WHEN 'closed' THEN
      v_template_name := 'ticket_closed';
      v_subject := 'Ticket Closed: ' || v_ticket.ticket_number || ' - ' || v_ticket.title;
      v_template_data := JSONB_BUILD_OBJECT(
        'ticket_number', v_ticket.ticket_number,
        'title', v_ticket.title,
        'status', v_ticket.status,
        'priority', v_ticket.priority,
        'closed_at', v_ticket.updated_at,
        'requester_name', COALESCE(v_ticket.full_name, v_ticket.email)
      );
    ELSE
      RAISE EXCEPTION 'Invalid event type: %', p_event_type;
  END CASE;
  
  INSERT INTO public.email_queue (
    to_email,
    subject,
    template_name,
    template_data,
    reply_to,
    priority
  ) VALUES (
    v_requester_email,
    v_subject,
    v_template_name,
    v_template_data,
    v_reply_to,
    3
  )
  RETURNING id INTO v_email_queue_id;
  
  RETURN v_email_queue_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_ticket_notification(UUID, TEXT, TEXT) TO authenticated;
