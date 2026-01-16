create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'saved_reply_visibility') then
    create type public.saved_reply_visibility as enum ('private', 'global');
  end if;
end
$$;

create table if not exists public.saved_replies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  visibility public.saved_reply_visibility not null default 'private',
  name text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_replies_user_name_uq unique (user_id, name)
);

drop trigger if exists saved_replies_set_updated_at on public.saved_replies;
create trigger saved_replies_set_updated_at
before update on public.saved_replies
for each row execute procedure public.set_updated_at();

alter table public.saved_replies enable row level security;

drop policy if exists saved_replies_select on public.saved_replies;
create policy saved_replies_select
on public.saved_replies
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    visibility = 'global'
    and (public.is_global_admin() or public.can_work_tickets() or public.is_in_operator_group('customer_service'))
  )
);

drop policy if exists saved_replies_insert on public.saved_replies;
create policy saved_replies_insert
on public.saved_replies
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

drop policy if exists saved_replies_update on public.saved_replies;
create policy saved_replies_update
on public.saved_replies
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

drop policy if exists saved_replies_delete on public.saved_replies;
create policy saved_replies_delete
on public.saved_replies
for delete
to authenticated
using (user_id = auth.uid() or public.is_global_admin() or public.has_role('service_desk_admin'));
