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

  if not (
    public.is_global_admin()
    or public.can_work_tickets()
    or public.is_in_operator_group('customer_service')
  ) then
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
