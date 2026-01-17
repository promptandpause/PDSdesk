-- Fix get_all_tickets_for_admins to handle ticket_status enum type

drop function if exists public.get_all_tickets_for_admins(int, int, text, uuid, text);

create or replace function public.get_all_tickets_for_admins(
  p_limit int default 50,
  p_offset int default 0,
  p_status text default null,
  p_queue_id uuid default null,
  p_search text default null
)
returns table (
  id uuid,
  ticket_number text,
  title text,
  status text,
  priority text,
  category text,
  assigned_to uuid,
  assigned_group_id uuid,
  requester_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
begin
  -- Check if user is admin
  if not (public.is_global_admin() or public.has_role('service_desk_admin')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Get total count
  select count(*)
  into v_total
  from public.tickets t
  where (p_status is null or t.status::text = p_status)
    and (p_queue_id is null or t.assigned_group_id = p_queue_id)
    and (p_search is null or p_search = '' or t.title ilike '%' || p_search || '%' or t.ticket_number ilike '%' || p_search || '%');

  -- Return tickets with total count
  return query
  select 
    t.id,
    t.ticket_number,
    t.title,
    t.status::text,
    t.priority::text,
    t.category,
    t.assigned_to,
    t.assigned_group_id,
    t.requester_id,
    t.created_at,
    t.updated_at,
    v_total as total_count
  from public.tickets t
  where (p_status is null or t.status::text = p_status)
    and (p_queue_id is null or t.assigned_group_id = p_queue_id)
    and (p_search is null or p_search = '' or t.title ilike '%' || p_search || '%' or t.ticket_number ilike '%' || p_search || '%')
  order by t.updated_at desc
  limit p_limit
  offset p_offset;
end;
$$;

revoke all on function public.get_all_tickets_for_admins(int, int, text, uuid, text) from public;
grant execute on function public.get_all_tickets_for_admins(int, int, text, uuid, text) to authenticated;
