-- Email reply-to-ticket functionality
-- Allows requesters to reply to notifications and have them added as ticket comments

-- Function to process email replies
create or replace function public.process_ticket_reply(
  p_email_queue_id uuid,
  p_reply_content text,
  p_reply_from_email text,
  p_reply_from_name text default null
)
returns jsonb
language plpgsql
security defimiter
set search_path = public
as $$
declare
  v_email_queue record;
  v_ticket_id uuid;
  v_user_id uuid;
  v_result jsonb;
begin
  -- Get original email details
  select * into v_email_queue
  from public.email_queue
  where id = p_email_queue_id;
  
  if v_email_queue is null then
    return jsonb_build_object('ok', false, 'error', 'Email not found');
  end if;
  
  -- Extract ticket ID from reply-to address or template data
  v_ticket_id := (v_email_queue.template_data->>'ticket_id')::uuid;
  
  if v_ticket_id is null then
    -- Try to extract from reply-to address
    v_ticket_id := public.extract_ticket_id_from_email(v_email_queue.reply_to);
  end if;
  
  if v_ticket_id is null then
    return jsonb_build_object('ok', false, 'error', 'Cannot determine ticket ID');
  end if;
  
  -- Find user by email
  select id into v_user_id
  from public.profiles
  where email = p_reply_from_email;
  
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'User not found');
  end if;
  
  -- Add as ticket comment
  insert into public.ticket_comments (
    ticket_id,
    author_id,
    body,
    is_internal
  ) values (
    v_ticket_id,
    v_user_id,
    'Email reply from ' || coalesce(p_reply_from_name, p_reply_from_email) || ':' || chr(10) || p_reply_content,
    false
  );
  
  -- Update ticket
  update public.tickets
  set updated_at = now()
  where id = v_ticket_id;
  
  -- Trigger notification for update
  perform public.enqueue_ticket_notification(v_ticket_id, 'updated');
  
  return jsonb_build_object('ok', true, 'ticket_id', v_ticket_id);
end;
$$;

-- Helper function to extract ticket ID from email address
create or replace function public.extract_ticket_id_from_email(p_email text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ticket_number text;
  v_ticket_id uuid;
begin
  -- Extract ticket number from format: servicedesk+TKT000123@promptandpause.com
  v_ticket_number := substring(p_email from 'servicedesk\+([A-Z0-9]+)@');
  
  if v_ticket_number is null then
    return null;
  end if;
  
  -- Find ticket by number
  select id into v_ticket_id
  from public.tickets
  where ticket_number = v_ticket_number;
  
  return v_ticket_id;
end;
$$;

-- RPC endpoint for email processing
create or replace function public.process_incoming_email(
  p_email_queue_id uuid,
  p_reply_content text,
  p_reply_from_email text,
  p_reply_from_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  v_result := public.process_ticket_reply(p_email_queue_id, p_reply_content, p_reply_from_email, p_reply_from_name);
  return v_result;
end;
$$;

grant execute on function public.process_incoming_email to authenticated;
grant execute on function public.extract_ticket_id_from_email to authenticated;
