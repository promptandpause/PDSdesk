-- System Settings Tables for PDSdesk
-- Includes: Organization, Notifications, Integrations, Security, and Operator Settings

-- ============================================
-- 1. ORGANIZATION SETTINGS (system-wide)
-- ============================================
create table if not exists public.organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null default 'PDSdesk',
  organization_logo_url text,
  support_email text default 'servicedesk@promptandpause.com',
  support_phone text,
  timezone text default 'UTC',
  date_format text default 'YYYY-MM-DD',
  time_format text default 'HH:mm',
  default_language text default 'en',
  business_hours_start time default '09:00',
  business_hours_end time default '17:00',
  business_days text[] default array['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  ticket_prefix text default 'TKT',
  auto_assign_tickets boolean default false,
  require_category boolean default true,
  allow_anonymous_tickets boolean default false,
  max_attachment_size_mb int default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insert default organization settings
insert into public.organization_settings (id) 
values ('00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- ============================================
-- 2. NOTIFICATION SETTINGS (system-wide defaults)
-- ============================================
create table if not exists public.notification_settings (
  id uuid primary key default gen_random_uuid(),
  -- Email notification triggers
  notify_on_ticket_created boolean default true,
  notify_on_ticket_assigned boolean default true,
  notify_on_ticket_updated boolean default true,
  notify_on_ticket_resolved boolean default true,
  notify_on_ticket_closed boolean default true,
  notify_on_comment_added boolean default true,
  notify_on_sla_breach boolean default true,
  notify_on_escalation boolean default true,
  -- Email settings
  email_from_name text default 'PDSdesk Support',
  email_from_address text default 'noreply@promptandpause.com',
  email_reply_to text default 'servicedesk@promptandpause.com',
  include_ticket_details_in_email boolean default true,
  email_footer_text text default 'This is an automated message from PDSdesk.',
  -- Digest settings
  send_daily_digest boolean default false,
  daily_digest_time time default '08:00',
  send_weekly_summary boolean default false,
  weekly_summary_day text default 'monday',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insert default notification settings
insert into public.notification_settings (id) 
values ('00000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

-- ============================================
-- 3. USER NOTIFICATION PREFERENCES (per-user)
-- ============================================
create table if not exists public.user_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- Email preferences
  email_on_ticket_assigned boolean default true,
  email_on_ticket_updated boolean default true,
  email_on_comment_added boolean default true,
  email_on_mention boolean default true,
  email_on_sla_warning boolean default true,
  -- In-app preferences
  browser_notifications boolean default true,
  sound_notifications boolean default false,
  -- Digest preferences
  receive_daily_digest boolean default false,
  receive_weekly_summary boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- ============================================
-- 4. INTEGRATIONS
-- ============================================
create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null, -- 'email', 'chat', 'monitoring', 'crm', 'custom'
  provider text not null, -- 'microsoft_graph', 'slack', 'teams', 'jira', etc.
  is_enabled boolean default false,
  config jsonb not null default '{}',
  credentials_encrypted text, -- encrypted API keys/secrets
  last_sync_at timestamptz,
  sync_status text default 'never_synced', -- 'synced', 'error', 'syncing'
  sync_error text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insert default integrations
insert into public.integrations (id, name, type, provider, is_enabled, config) values
  ('00000000-0000-0000-0000-000000000010', 'Microsoft 365 Email', 'email', 'microsoft_graph', true, '{"description": "Inbound email to ticket creation"}'),
  ('00000000-0000-0000-0000-000000000011', 'Azure AD Directory Sync', 'directory', 'microsoft_graph', true, '{"description": "User directory synchronization"}'),
  ('00000000-0000-0000-0000-000000000012', 'Microsoft Teams', 'chat', 'microsoft_teams', false, '{"description": "Teams notifications and bot"}')
on conflict (id) do nothing;

-- ============================================
-- 5. SECURITY SETTINGS
-- ============================================
create table if not exists public.security_settings (
  id uuid primary key default gen_random_uuid(),
  -- SSO Settings
  sso_enabled boolean default true,
  sso_provider text default 'azure',
  sso_enforce_for_all boolean default false,
  sso_allowed_domains text[] default array['promptandpause.com'],
  -- Session settings
  session_timeout_minutes int default 480, -- 8 hours
  idle_timeout_minutes int default 60,
  max_concurrent_sessions int default 5,
  -- Password policy (for local accounts if any)
  password_min_length int default 12,
  password_require_uppercase boolean default true,
  password_require_lowercase boolean default true,
  password_require_number boolean default true,
  password_require_special boolean default true,
  password_expiry_days int default 90,
  -- MFA settings
  mfa_enabled boolean default false,
  mfa_enforce_for_admins boolean default false,
  mfa_methods text[] default array['totp', 'email'],
  -- IP restrictions
  ip_whitelist_enabled boolean default false,
  ip_whitelist text[] default array[]::text[],
  -- Audit
  audit_log_retention_days int default 365,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insert default security settings
insert into public.security_settings (id) 
values ('00000000-0000-0000-0000-000000000003')
on conflict (id) do nothing;

-- ============================================
-- 6. OPERATOR SETTINGS (per-operator preferences)
-- ============================================
create table if not exists public.operator_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- Dashboard preferences
  default_queue text,
  tickets_per_page int default 25,
  auto_refresh_enabled boolean default true,
  auto_refresh_interval_seconds int default 60,
  -- Ticket handling
  auto_assign_on_reply boolean default false,
  signature text,
  default_ticket_view text default 'list', -- 'list', 'kanban'
  -- UI preferences
  compact_mode boolean default false,
  show_ticket_preview boolean default true,
  theme text default 'system', -- 'light', 'dark', 'system'
  -- Keyboard shortcuts
  keyboard_shortcuts_enabled boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Organization Settings: only global_admin can modify
alter table public.organization_settings enable row level security;

create policy organization_settings_select on public.organization_settings
  for select to authenticated using (true);

create policy organization_settings_update on public.organization_settings
  for update to authenticated using (public.is_global_admin());

-- Notification Settings: global_admin and service_desk_admin can modify
alter table public.notification_settings enable row level security;

create policy notification_settings_select on public.notification_settings
  for select to authenticated using (true);

create policy notification_settings_update on public.notification_settings
  for update to authenticated using (
    public.is_global_admin() or public.has_role('service_desk_admin')
  );

-- User Notification Preferences: users can manage their own
alter table public.user_notification_preferences enable row level security;

create policy user_notification_preferences_select on public.user_notification_preferences
  for select to authenticated using (user_id = auth.uid() or public.is_global_admin());

create policy user_notification_preferences_insert on public.user_notification_preferences
  for insert to authenticated with check (user_id = auth.uid());

create policy user_notification_preferences_update on public.user_notification_preferences
  for update to authenticated using (user_id = auth.uid());

create policy user_notification_preferences_delete on public.user_notification_preferences
  for delete to authenticated using (user_id = auth.uid());

-- Integrations: only global_admin can manage
alter table public.integrations enable row level security;

create policy integrations_select on public.integrations
  for select to authenticated using (
    public.is_global_admin() or public.has_role('service_desk_admin')
  );

create policy integrations_all on public.integrations
  for all to authenticated using (public.is_global_admin());

-- Security Settings: only global_admin
alter table public.security_settings enable row level security;

create policy security_settings_select on public.security_settings
  for select to authenticated using (public.is_global_admin());

create policy security_settings_update on public.security_settings
  for update to authenticated using (public.is_global_admin());

-- Operator Settings: operators can manage their own
alter table public.operator_settings enable row level security;

create policy operator_settings_select on public.operator_settings
  for select to authenticated using (user_id = auth.uid() or public.is_global_admin());

create policy operator_settings_insert on public.operator_settings
  for insert to authenticated with check (user_id = auth.uid());

create policy operator_settings_update on public.operator_settings
  for update to authenticated using (user_id = auth.uid());

create policy operator_settings_delete on public.operator_settings
  for delete to authenticated using (user_id = auth.uid());

-- ============================================
-- INDEXES
-- ============================================
create index if not exists user_notification_preferences_user_id_idx on public.user_notification_preferences(user_id);
create index if not exists operator_settings_user_id_idx on public.operator_settings(user_id);
create index if not exists integrations_type_idx on public.integrations(type);
create index if not exists integrations_provider_idx on public.integrations(provider);

-- ============================================
-- TRIGGERS for updated_at
-- ============================================
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger organization_settings_updated_at
  before update on public.organization_settings
  for each row execute function public.update_updated_at_column();

create trigger notification_settings_updated_at
  before update on public.notification_settings
  for each row execute function public.update_updated_at_column();

create trigger user_notification_preferences_updated_at
  before update on public.user_notification_preferences
  for each row execute function public.update_updated_at_column();

create trigger integrations_updated_at
  before update on public.integrations
  for each row execute function public.update_updated_at_column();

create trigger security_settings_updated_at
  before update on public.security_settings
  for each row execute function public.update_updated_at_column();

create trigger operator_settings_updated_at
  before update on public.operator_settings
  for each row execute function public.update_updated_at_column();
