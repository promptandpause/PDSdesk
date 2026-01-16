create or replace function public.set_user_primary_role(target_user_id uuid, new_role_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  target_is_global_admin boolean;
  normalized_role text;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not (public.is_global_admin() or public.has_role('service_desk_admin')) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if target_user_id is null then
    raise exception 'target_user_id is required' using errcode = '22023';
  end if;

  if target_user_id = caller_id then
    raise exception 'cannot modify own role' using errcode = '42501';
  end if;

  normalized_role := lower(coalesce(new_role_key, ''));
  if normalized_role not in ('requester', 'operator', 'service_desk_admin', 'global_admin') then
    raise exception 'invalid role' using errcode = '22023';
  end if;

  select exists(
    select 1
    from public.user_roles ur
    where ur.user_id = target_user_id
      and ur.role_key = 'global_admin'
  ) into target_is_global_admin;

  if target_is_global_admin then
    raise exception 'cannot modify a global admin user' using errcode = '42501';
  end if;

  if (not public.is_global_admin()) and normalized_role = 'global_admin' then
    raise exception 'cannot grant global_admin' using errcode = '42501';
  end if;

  delete from public.user_roles
  where user_id = target_user_id
    and role_key in ('requester', 'operator', 'service_desk_admin', 'global_admin');

  insert into public.user_roles (user_id, role_key)
  values (target_user_id, normalized_role)
  on conflict (user_id, role_key) do nothing;
end;
$$;

revoke all on function public.set_user_primary_role(uuid, text) from public;
grant execute on function public.set_user_primary_role(uuid, text) to authenticated;
