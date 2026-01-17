-- RPC function to deactivate users (prevent sign-in)
-- Only global_admin can deactivate users, and they cannot deactivate themselves

-- Add is_active column to profiles if not exists
alter table public.profiles add column if not exists is_active boolean not null default true;

-- Create index for faster lookups
create index if not exists profiles_is_active_idx on public.profiles (is_active);

-- Deactivate a single user
create or replace function public.deactivate_user(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_target_profile record;
begin
  -- Get caller's user ID
  v_caller_id := auth.uid();
  
  -- Check if caller is global admin
  if not public.is_global_admin() then
    raise exception 'forbidden: only global admins can deactivate users' using errcode = '42501';
  end if;

  -- Prevent self-deactivation
  if p_user_id = v_caller_id then
    return jsonb_build_object('ok', false, 'error', 'You cannot deactivate yourself');
  end if;

  -- Get target profile
  select * into v_target_profile
  from public.profiles
  where id = p_user_id;

  if v_target_profile is null then
    return jsonb_build_object('ok', false, 'error', 'User not found');
  end if;

  -- Check if target is already deactivated
  if not v_target_profile.is_active then
    return jsonb_build_object('ok', true, 'message', 'User is already deactivated');
  end if;

  -- Deactivate the user
  update public.profiles
  set is_active = false
  where id = p_user_id;

  -- Log the action
  insert into public.audit_log (
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values
  ) values (
    v_caller_id,
    'deactivate_user',
    'profile',
    p_user_id,
    jsonb_build_object('is_active', true),
    jsonb_build_object('is_active', false)
  );

  return jsonb_build_object('ok', true, 'message', 'User deactivated successfully');
end;
$$;

-- Bulk deactivate multiple users
create or replace function public.deactivate_users_bulk(
  p_user_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_user_id uuid;
  v_result jsonb;
  v_results jsonb[] := '{}';
  v_success_count int := 0;
  v_error_count int := 0;
begin
  -- Get caller's user ID
  v_caller_id := auth.uid();
  
  -- Check if caller is global admin
  if not public.is_global_admin() then
    raise exception 'forbidden: only global admins can deactivate users' using errcode = '42501';
  end if;

  foreach v_user_id in array p_user_ids
  loop
    begin
      -- Skip self
      if v_user_id = v_caller_id then
        v_error_count := v_error_count + 1;
        v_results := array_append(v_results, jsonb_build_object('ok', false, 'user_id', v_user_id, 'error', 'Cannot deactivate yourself'));
        continue;
      end if;

      v_result := public.deactivate_user(v_user_id);
      if (v_result->>'ok')::boolean then
        v_success_count := v_success_count + 1;
      else
        v_error_count := v_error_count + 1;
      end if;
      v_results := array_append(v_results, v_result || jsonb_build_object('user_id', v_user_id));
    exception when others then
      v_error_count := v_error_count + 1;
      v_results := array_append(v_results, jsonb_build_object('ok', false, 'user_id', v_user_id, 'error', sqlerrm));
    end;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'success_count', v_success_count,
    'error_count', v_error_count,
    'results', to_jsonb(v_results)
  );
end;
$$;

-- Reactivate a single user
create or replace function public.reactivate_user(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_target_profile record;
begin
  -- Get caller's user ID
  v_caller_id := auth.uid();
  
  -- Check if caller is global admin
  if not public.is_global_admin() then
    raise exception 'forbidden: only global admins can reactivate users' using errcode = '42501';
  end if;

  -- Get target profile
  select * into v_target_profile
  from public.profiles
  where id = p_user_id;

  if v_target_profile is null then
    return jsonb_build_object('ok', false, 'error', 'User not found');
  end if;

  -- Check if target is already active
  if v_target_profile.is_active then
    return jsonb_build_object('ok', true, 'message', 'User is already active');
  end if;

  -- Reactivate the user
  update public.profiles
  set is_active = true
  where id = p_user_id;

  -- Log the action
  insert into public.audit_log (
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values
  ) values (
    v_caller_id,
    'reactivate_user',
    'profile',
    p_user_id,
    jsonb_build_object('is_active', false),
    jsonb_build_object('is_active', true)
  );

  return jsonb_build_object('ok', true, 'message', 'User reactivated successfully');
end;
$$;

grant execute on function public.deactivate_user(uuid) to authenticated;
grant execute on function public.deactivate_users_bulk(uuid[]) to authenticated;
grant execute on function public.reactivate_user(uuid) to authenticated;
