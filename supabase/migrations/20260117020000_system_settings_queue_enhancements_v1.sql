-- System Settings table for general ITSM configuration
create table if not exists public.system_settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz not null default now()
);

alter table public.system_settings enable row level security;

drop policy if exists system_settings_select on public.system_settings;
create policy system_settings_select
on public.system_settings
for select
to authenticated
using (public.is_global_admin() or public.has_role('service_desk_admin'));

drop policy if exists system_settings_insert on public.system_settings;
create policy system_settings_insert
on public.system_settings
for insert
to authenticated
with check (public.is_global_admin());

drop policy if exists system_settings_update on public.system_settings;
create policy system_settings_update
on public.system_settings
for update
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

drop policy if exists system_settings_delete on public.system_settings;
create policy system_settings_delete
on public.system_settings
for delete
to authenticated
using (public.is_global_admin());

-- Add email and auto-assign columns to operator_groups for queue management
alter table public.operator_groups 
  add column if not exists email_address text,
  add column if not exists auto_assign boolean not null default false;

-- Seed default system settings
insert into public.system_settings (key, value, description) values
  ('session_timeout_minutes', '480', 'Session timeout in minutes'),
  ('max_attachment_size_mb', '25', 'Maximum attachment size in MB'),
  ('default_ticket_priority', 'medium', 'Default priority for new tickets'),
  ('auto_close_resolved_days', '7', 'Days after which resolved tickets auto-close'),
  ('enable_customer_portal', 'true', 'Enable customer self-service portal'),
  ('enable_email_notifications', 'true', 'Enable email notifications'),
  ('enable_sla_breach_alerts', 'true', 'Enable SLA breach alerts'),
  ('working_hours_start', '09:00', 'Working hours start time'),
  ('working_hours_end', '17:00', 'Working hours end time'),
  ('working_days', 'mon,tue,wed,thu,fri', 'Working days of the week'),
  ('timezone', 'UTC', 'System timezone')
on conflict (key) do nothing;
