-- Fix RPC function to use azure_ad_id (text) instead of id (uuid)
-- The directory_users table uses azure_ad_id as the primary key

drop function if exists public.activate_directory_user(uuid);
drop function if exists public.activate_directory_users_bulk(uuid[]);

create or replace function public.activate_directory_user(
  p_azure_ad_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dir_user record;
  v_existing_profile_id uuid;
  v_new_profile_id uuid;
begin
  -- Check if caller is admin
  if not (public.is_global_admin() or public.has_role('service_desk_admin')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Get directory user by azure_ad_id (which is the primary key)
  select * into v_dir_user
  from public.directory_users
  where azure_ad_id = p_azure_ad_id;

  if v_dir_user is null then
    return jsonb_build_object('ok', false, 'error', 'Directory user not found');
  end if;

  -- Check if profile already exists for this azure_ad_id
  select id into v_existing_profile_id
  from public.profiles
  where azure_ad_id = v_dir_user.azure_ad_id;

  if v_existing_profile_id is not null then
    return jsonb_build_object('ok', true, 'profile_id', v_existing_profile_id, 'message', 'Profile already exists');
  end if;

  -- Check if profile exists with same email
  select id into v_existing_profile_id
  from public.profiles
  where email = v_dir_user.email and azure_ad_id is null;

  if v_existing_profile_id is not null then
    -- Link existing profile to Azure AD
    update public.profiles
    set 
      azure_ad_id = v_dir_user.azure_ad_id,
      full_name = coalesce(v_dir_user.full_name, full_name),
      department = coalesce(v_dir_user.department, department),
      job_title = coalesce(v_dir_user.job_title, job_title),
      office_location = coalesce(v_dir_user.office_location, office_location)
    where id = v_existing_profile_id;

    return jsonb_build_object('ok', true, 'profile_id', v_existing_profile_id, 'message', 'Linked existing profile to Azure AD');
  end if;

  -- Create new profile
  v_new_profile_id := gen_random_uuid();
  
  insert into public.profiles (
    id,
    email,
    full_name,
    azure_ad_id,
    department,
    job_title,
    office_location,
    mobile_phone,
    business_phone
  ) values (
    v_new_profile_id,
    v_dir_user.email,
    v_dir_user.full_name,
    v_dir_user.azure_ad_id,
    v_dir_user.department,
    v_dir_user.job_title,
    v_dir_user.office_location,
    v_dir_user.mobile_phone,
    v_dir_user.business_phone
  );

  -- Assign requester role by default
  insert into public.user_roles (user_id, role_key)
  values (v_new_profile_id, 'requester')
  on conflict do nothing;

  return jsonb_build_object('ok', true, 'profile_id', v_new_profile_id, 'message', 'Created new profile');
end;
$$;

-- Bulk activate multiple directory users by azure_ad_id
create or replace function public.activate_directory_users_bulk(
  p_azure_ad_ids text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_azure_ad_id text;
  v_result jsonb;
  v_results jsonb[] := '{}';
  v_success_count int := 0;
  v_error_count int := 0;
begin
  -- Check if caller is admin
  if not (public.is_global_admin() or public.has_role('service_desk_admin')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  foreach v_azure_ad_id in array p_azure_ad_ids
  loop
    begin
      v_result := public.activate_directory_user(v_azure_ad_id);
      if (v_result->>'ok')::boolean then
        v_success_count := v_success_count + 1;
      else
        v_error_count := v_error_count + 1;
      end if;
      v_results := array_append(v_results, v_result || jsonb_build_object('azure_ad_id', v_azure_ad_id));
    exception when others then
      v_error_count := v_error_count + 1;
      v_results := array_append(v_results, jsonb_build_object('ok', false, 'azure_ad_id', v_azure_ad_id, 'error', sqlerrm));
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

grant execute on function public.activate_directory_user(text) to authenticated;
grant execute on function public.activate_directory_users_bulk(text[]) to authenticated;
