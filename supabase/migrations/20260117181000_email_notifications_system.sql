-- Email notification system for ticket lifecycle events
-- Handles ticket creation, updates, resolution, and closure notifications

-- Email queue for notifications
create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  body_html text not null,
  body_text text not null,
  reply_to text, -- For reply-to functionality
  template_name text not null,
  template_data jsonb not null default '{}'::jsonb,
  priority int default 5, -- 1=highest, 5=lowest
  send_at timestamptz not null default now(),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for email queue
create index if not exists email_queue_send_at_idx on public.email_queue(send_at);
create index if not exists email_queue_sent_at_idx on public.email_queue(sent_at);
create index if not exists email_queue_priority_idx on public.email_queue(priority, send_at);

-- Email logs for tracking
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  email_queue_id uuid references public.email_queue(id) on delete set null,
  to_email text not null,
  template_name text not null,
  status text not null, -- 'sent', 'failed', 'bounced'
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- Function to enqueue ticket notifications
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
      raise exception 'Invalid event type: %', p_event_type;
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
    'servicedesk+' || v_ticket.ticket_number || '@promptandpause.com',
    3 -- Higher priority for ticket notifications
  )
  returning id into v_email_queue_id;
  
  return v_email_queue_id;
end;
$$;

-- Triggers for automatic notifications
drop trigger if exists ticket_created_notification_trigger on public.tickets;
create trigger ticket_created_notification_trigger
after insert on public.tickets
for each row execute procedure public.enqueue_ticket_notification(new.id, 'created');

drop trigger if exists ticket_updated_notification_trigger on public.tickets;
create trigger ticket_updated_notification_trigger
after update on public.tickets
for each row 
when (old.status is distinct from new.status or old.updated_at is distinct from new.updated_at)
execute procedure public.enqueue_ticket_notification(new.id, 'updated');

-- Function to handle ticket status changes
create or replace function public.handle_ticket_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    case new.status
      when 'resolved' then
        perform public.enqueue_ticket_notification(new.id, 'resolved');
      when 'closed' then
        perform public.enqueue_ticket_notification(new.id, 'closed');
    end case;
  end if;
  
  return new;
end;
$$;

drop trigger if exists ticket_status_change_notification_trigger on public.tickets;
create trigger ticket_status_change_notification_trigger
after update on public.tickets
for each row
when (old.status is distinct from new.status)
execute procedure public.handle_ticket_status_change();

-- RLS for email queue
alter table public.email_queue enable row level security;

drop policy if exists email_queue_select on public.email_queue;
create policy email_queue_select
on public.email_queue
for select
to authenticated
using (public.is_global_admin());

drop policy if exists email_queue_insert on public.email_queue;
create policy email_queue_insert
on public.email_queue
for insert
to authenticated
with check (public.is_global_admin());

-- RLS for email logs
alter table public.email_logs enable row level security;

drop policy if exists email_logs_select on public.email_logs;
create policy email_logs_select
on public.email_logs
for select
to authenticated
using (public.is_global_admin());
