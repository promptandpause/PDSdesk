create or replace function public.delete_tickets_and_audit(ticket_ids uuid[], source text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = on
as $$
declare
  v_actor_id uuid;
  v_ticket_numbers text[];
  v_deleted_count int;
  v_disallowed_count int;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'unauthorized' using errcode = '28000';
  end if;

  if ticket_ids is null or array_length(ticket_ids, 1) is null then
    return jsonb_build_object('deleted', 0, 'ticket_numbers', jsonb_build_array());
  end if;

  if not (public.is_global_admin() or public.can_work_tickets()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select count(*)
  into v_disallowed_count
  from public.tickets t
  where t.id = any(ticket_ids)
    and t.ticket_type = 'customer_service'
    and not public.is_global_admin();

  if v_disallowed_count > 0 then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(array_agg(t.ticket_number order by t.ticket_number), array[]::text[])
  into v_ticket_numbers
  from public.tickets t
  where t.id = any(ticket_ids);

  delete from public.tickets t
  where t.id = any(ticket_ids);

  get diagnostics v_deleted_count = row_count;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_actor_id,
    'tickets_deleted',
    'tickets',
    null,
    jsonb_build_object(
      'source', coalesce(source, 'rpc'),
      'ticket_ids', ticket_ids,
      'ticket_numbers', v_ticket_numbers
    )
  );

  return jsonb_build_object('deleted', v_deleted_count, 'ticket_numbers', v_ticket_numbers);
end;
$$;

revoke all on function public.delete_tickets_and_audit(uuid[], text) from public;
grant execute on function public.delete_tickets_and_audit(uuid[], text) to authenticated;
