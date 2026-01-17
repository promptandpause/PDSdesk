-- RPC function to activate a directory user as a profile
-- This allows admins to force-create profiles for AD users without them logging in

create or replace function public.activate_directory_user(
  p_directory_user_id uuid
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

  -- Get directory user
  select * into v_dir_user
  from public.directory_users
  where id = p_directory_user_id;

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
  -- First we need to create an auth.users entry
  -- Since we can't do that directly, we'll create a profile with a generated UUID
  -- The user will be able to log in via SSO and their profile will be linked
  
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

-- Bulk activate multiple directory users
create or replace function public.activate_directory_users_bulk(
  p_directory_user_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_result jsonb;
  v_results jsonb[] := '{}';
  v_success_count int := 0;
  v_error_count int := 0;
begin
  -- Check if caller is admin
  if not (public.is_global_admin() or public.has_role('service_desk_admin')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  foreach v_id in array p_directory_user_ids
  loop
    begin
      v_result := public.activate_directory_user(v_id);
      if (v_result->>'ok')::boolean then
        v_success_count := v_success_count + 1;
      else
        v_error_count := v_error_count + 1;
      end if;
      v_results := array_append(v_results, v_result || jsonb_build_object('directory_user_id', v_id));
    exception when others then
      v_error_count := v_error_count + 1;
      v_results := array_append(v_results, jsonb_build_object('ok', false, 'directory_user_id', v_id, 'error', sqlerrm));
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

grant execute on function public.activate_directory_user(uuid) to authenticated;
grant execute on function public.activate_directory_users_bulk(uuid[]) to authenticated;
