create or replace function public.can_work_tickets()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('global_admin')
      or public.has_role('service_desk_admin')
      or public.has_role('operator')
      or public.is_in_operator_group('it_services');
$$;

-- Allow service desk admins to view all profiles (needed for user management UI)

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin
on public.profiles
for select
to authenticated
using (public.is_global_admin() or public.has_role('service_desk_admin'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    updated_at = now();

  insert into public.user_roles (user_id, role_key)
  values (new.id, 'requester')
  on conflict (user_id, role_key) do nothing;

  return new;
end;
$$;

-- Ensure every authenticated user can see user_roles for user management

drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select
on public.user_roles
for select
to authenticated
using (user_id = auth.uid() or public.is_global_admin() or public.has_role('service_desk_admin'));

-- Role writes stay global-admin only (existing policies remain in place)

-- service desk admins can manage operator group membership

drop policy if exists operator_group_members_select on public.operator_group_members;
create policy operator_group_members_select
on public.operator_group_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_global_admin()
  or public.has_role('service_desk_admin')
);

drop policy if exists operator_group_members_admin_write on public.operator_group_members;
create policy operator_group_members_admin_write
on public.operator_group_members
for all
to authenticated
using (public.is_global_admin() or public.has_role('service_desk_admin'))
with check (public.is_global_admin() or public.has_role('service_desk_admin'));

-- Operator group member listing RPC should be limited to admins

create or replace function public.list_operator_group_members(group_id uuid)
returns table (
  id uuid,
  full_name text,
  email text,
  avatar_url text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if group_id is null then
    return;
  end if;

  if not (public.is_global_admin() or public.has_role('service_desk_admin')) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select p.id, p.full_name, p.email, p.avatar_url
  from public.operator_group_members ogm
  join public.profiles p on p.id = ogm.user_id
  where ogm.group_id = list_operator_group_members.group_id
  order by coalesce(p.full_name, p.email) asc;
end;
$$;

revoke all on function public.list_operator_group_members(uuid) from public;
grant execute on function public.list_operator_group_members(uuid) to authenticated;
