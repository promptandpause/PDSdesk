-- Fix: Internal comments should NOT change ticket status to in_progress

create or replace function public.tickets_auto_in_progress_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cur_status public.ticket_status;
  ttype text;
  is_agent boolean;
begin
  -- SKIP internal comments - they should NOT trigger status changes
  if new.is_internal = true then
    return new;
  end if;

  select t.status, t.ticket_type
    into cur_status, ttype
  from public.tickets t
  where t.id = new.ticket_id;

  if cur_status is null then
    return new;
  end if;

  is_agent := public.can_work_tickets();
  if not is_agent and ttype = 'customer_service' then
    is_agent := public.is_in_operator_group('customer_service');
  end if;

  if not is_agent then
    return new;
  end if;

  if cur_status in ('new', 'open', 'pending') then
    update public.tickets
    set status = 'in_progress'
    where id = new.ticket_id
      and status = cur_status;

    insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
    values (
      new.ticket_id,
      new.author_id,
      'ticket_status_changed',
      jsonb_build_object('from', cur_status::text, 'to', 'in_progress', 'reason', 'agent_comment', 'comment_id', new.id)
    );
  end if;

  return new;
end;
$$;
