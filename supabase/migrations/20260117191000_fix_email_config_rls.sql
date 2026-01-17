-- Fix RLS for email_config to allow service role access
-- The service role should bypass RLS, but we also need to allow
-- the edge functions to read config

-- Drop existing policies
drop policy if exists email_config_select on public.email_config;
drop policy if exists email_config_all on public.email_config;

-- Recreate with service_role bypass
alter table public.email_config enable row level security;

-- Allow authenticated global admins to manage config
create policy email_config_admin_select
on public.email_config
for select
to authenticated
using (public.is_global_admin());

create policy email_config_admin_all
on public.email_config
for all
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

-- Allow service_role to bypass (for edge functions)
create policy email_config_service_role
on public.email_config
for all
to service_role
using (true)
with check (true);

-- Also fix inbound_emails RLS
drop policy if exists inbound_emails_select on public.inbound_emails;

create policy inbound_emails_admin_select
on public.inbound_emails
for select
to authenticated
using (public.is_global_admin());

create policy inbound_emails_service_role
on public.inbound_emails
for all
to service_role
using (true)
with check (true);
