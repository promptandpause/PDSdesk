alter table public.saved_selections
  add column if not exists is_pinned boolean not null default false;

alter table public.saved_selections
  add column if not exists visibility text not null default 'private'
  check (visibility in ('private', 'global'));

drop policy if exists saved_selections_select_own on public.saved_selections;
create policy saved_selections_select_own
on public.saved_selections
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    visibility = 'global'
    and (public.is_global_admin() or public.can_work_tickets() or public.is_in_operator_group('customer_service'))
  )
);

drop policy if exists saved_selections_insert_own on public.saved_selections;
create policy saved_selections_insert_own
on public.saved_selections
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    visibility = 'private'
    or public.is_global_admin()
    or public.has_role('service_desk_admin')
  )
);

drop policy if exists saved_selections_update_own on public.saved_selections;
create policy saved_selections_update_own
on public.saved_selections
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    visibility = 'private'
    or public.is_global_admin()
    or public.has_role('service_desk_admin')
  )
);

drop policy if exists saved_selections_delete_own on public.saved_selections;
create policy saved_selections_delete_own
on public.saved_selections
for delete
to authenticated
using (user_id = auth.uid());
