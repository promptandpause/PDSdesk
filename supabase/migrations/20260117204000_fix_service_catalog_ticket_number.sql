-- Fix submit_service_catalog_request to use the correct ticket number generation
-- The function was trying to parse TKT- format but actual format is T-YYYY-NNNNNN

drop function if exists public.submit_service_catalog_request(uuid, jsonb);

create or replace function public.submit_service_catalog_request(
  p_catalog_item_id uuid,
  p_form_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_catalog_item record;
  v_category record;
  v_request_id uuid;
  v_ticket_id uuid;
  v_ticket_number text;
  v_title text;
  v_description text;
begin
  v_user_id := auth.uid();
  
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  -- Get catalog item
  select * into v_catalog_item
  from public.service_catalog_items
  where id = p_catalog_item_id and is_active = true;

  if v_catalog_item is null then
    return jsonb_build_object('ok', false, 'error', 'Catalog item not found');
  end if;

  -- Get category
  select * into v_category
  from public.service_catalog_categories
  where id = v_catalog_item.category_id;

  -- Build ticket title and description
  v_title := coalesce(v_category.name, 'Service Request') || ': ' || v_catalog_item.name;
  v_description := 'Service Catalog Request: ' || v_catalog_item.name || E'\n\n';
  v_description := v_description || 'Category: ' || coalesce(v_category.name, 'General') || E'\n';
  v_description := v_description || 'Estimated Time: ' || coalesce(v_catalog_item.estimated_time, 'Not specified') || E'\n\n';
  v_description := v_description || 'Form Data:' || E'\n' || jsonb_pretty(p_form_data);

  -- Use the existing next_ticket_number() function for proper format
  v_ticket_number := public.next_ticket_number();

  -- Create ticket with queue assignment from catalog item
  insert into public.tickets (
    ticket_number,
    title,
    description,
    status,
    priority,
    requester_id,
    created_by,
    assignment_group_id,
    source
  ) values (
    v_ticket_number,
    v_title,
    v_description,
    'open',
    coalesce(v_catalog_item.default_priority, 'medium'),
    v_user_id,
    v_user_id,
    v_catalog_item.default_operator_group_id,
    'service_catalog'
  )
  returning id into v_ticket_id;

  -- Create service catalog request record
  insert into public.service_catalog_requests (
    catalog_item_id,
    requester_id,
    ticket_id,
    form_data,
    status
  ) values (
    p_catalog_item_id,
    v_user_id,
    v_ticket_id,
    p_form_data,
    case when v_catalog_item.requires_approval then 'pending' else 'approved' end
  )
  returning id into v_request_id;

  return jsonb_build_object(
    'ok', true,
    'request_id', v_request_id,
    'ticket_id', v_ticket_id,
    'ticket_number', v_ticket_number
  );
end;
$$;

grant execute on function public.submit_service_catalog_request(uuid, jsonb) to authenticated;
