-- Email configuration for Microsoft Graph integration
-- Stores settings for email processing

create table if not exists public.email_config (
  id uuid primary key default gen_random_uuid(),
  config_key text not null unique,
  config_value text not null,
  is_encrypted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS for email_config - admin only
alter table public.email_config enable row level security;

drop policy if exists email_config_select on public.email_config;
create policy email_config_select
on public.email_config
for select
to authenticated
using (public.is_global_admin());

drop policy if exists email_config_all on public.email_config;
create policy email_config_all
on public.email_config
for all
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

-- Insert default configuration (values to be updated in Supabase dashboard)
insert into public.email_config (config_key, config_value, is_encrypted) values
  ('ms_tenant_id', '', true),
  ('ms_client_id', '', true),
  ('ms_client_secret', '', true),
  ('ms_mailbox_email', 'servicedesk@promptandpause.com', false),
  ('email_poll_interval_seconds', '60', false),
  ('email_enabled', 'false', false)
on conflict (config_key) do nothing;

-- Inbound email log for tracking processed emails
create table if not exists public.inbound_emails (
  id uuid primary key default gen_random_uuid(),
  ms_message_id text not null unique,
  from_email text not null,
  from_name text,
  subject text not null,
  body_text text,
  body_html text,
  received_at timestamptz not null,
  processed_at timestamptz,
  ticket_id uuid references public.tickets(id) on delete set null,
  comment_id uuid,
  status text not null default 'pending', -- 'pending', 'processed', 'failed', 'ignored'
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists inbound_emails_ms_message_id_idx on public.inbound_emails(ms_message_id);
create index if not exists inbound_emails_status_idx on public.inbound_emails(status);
create index if not exists inbound_emails_from_email_idx on public.inbound_emails(from_email);

-- RLS for inbound_emails
alter table public.inbound_emails enable row level security;

drop policy if exists inbound_emails_select on public.inbound_emails;
create policy inbound_emails_select
on public.inbound_emails
for select
to authenticated
using (public.is_global_admin());

-- Function to get email config value
create or replace function public.get_email_config(p_key text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_value text;
begin
  select config_value into v_value
  from public.email_config
  where config_key = p_key;
  
  return v_value;
end;
$$;

-- Function to check if email processing is enabled
create or replace function public.is_email_enabled()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return (public.get_email_config('email_enabled') = 'true');
end;
$$;
