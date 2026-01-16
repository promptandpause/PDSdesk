create table if not exists public.directory_users (
  azure_ad_id text primary key,
  email text,
  full_name text,
  given_name text,
  surname text,
  job_title text,
  department text,
  office_location text,
  mobile_phone text,
  business_phone text,
  account_enabled boolean,
  raw jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz not null default now()
);

create index if not exists directory_users_email_idx on public.directory_users (email);

alter table public.directory_users enable row level security;

drop policy if exists directory_users_select_agents on public.directory_users;
create policy directory_users_select_agents
on public.directory_users
for select
to authenticated
using (
  public.is_global_admin()
  or public.can_work_tickets()
  or public.is_in_operator_group('customer_service')
);

drop policy if exists directory_users_admin_write on public.directory_users;
create policy directory_users_admin_write
on public.directory_users
for all
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

alter table public.profiles add column if not exists azure_ad_id text;
alter table public.profiles add column if not exists department text;
alter table public.profiles add column if not exists job_title text;
alter table public.profiles add column if not exists office_location text;
alter table public.profiles add column if not exists mobile_phone text;
alter table public.profiles add column if not exists business_phone text;

create unique index if not exists profiles_azure_ad_id_uniq on public.profiles (azure_ad_id) where azure_ad_id is not null;
