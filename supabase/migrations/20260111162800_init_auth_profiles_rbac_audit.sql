-- Foundation schema for SSO-backed Supabase Auth

create extension if not exists pgcrypto;

-- Profiles: one row per auth user (SSO user) keyed to auth.users.id
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  role_key text primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_key text not null references public.roles(role_key) on delete restrict,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles(id) on delete set null,
  primary key (user_id, role_key)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Trigger to keep updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

-- RBAC helpers (security definer so they can be used safely in RLS policies)
create or replace function public.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role_key = required_role
  );
$$;

create or replace function public.is_global_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('global_admin');
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.audit_logs enable row level security;

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin
on public.profiles
for select
to authenticated
using (public.is_global_admin());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
on public.profiles
for update
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

-- roles (readable by signed-in users)
drop policy if exists roles_select_authenticated on public.roles;
create policy roles_select_authenticated
on public.roles
for select
to authenticated
using (true);

-- user_roles
drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select
on public.user_roles
for select
to authenticated
using (user_id = auth.uid() or public.is_global_admin());

drop policy if exists user_roles_admin_insert on public.user_roles;
create policy user_roles_admin_insert
on public.user_roles
for insert
to authenticated
with check (public.is_global_admin());

drop policy if exists user_roles_admin_update on public.user_roles;
create policy user_roles_admin_update
on public.user_roles
for update
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

drop policy if exists user_roles_admin_delete on public.user_roles;
create policy user_roles_admin_delete
on public.user_roles
for delete
to authenticated
using (public.is_global_admin());

-- audit_logs
drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin
on public.audit_logs
for select
to authenticated
using (public.is_global_admin());

drop policy if exists audit_logs_insert_self on public.audit_logs;
create policy audit_logs_insert_self
on public.audit_logs
for insert
to authenticated
with check (actor_id = auth.uid());

-- Seed roles
insert into public.roles (role_key, name, description) values
  ('global_admin', 'Global Admin', 'Full access to all ITSM administration and data'),
  ('service_desk_admin', 'Service Desk Admin', 'Manage service desk configuration and queues'),
  ('operator', 'Operator', 'Work tickets and queues'),
  ('requester', 'Requester', 'Create and view own tickets')
on conflict (role_key) do nothing;

-- Auto-create profile on first SSO login
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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
