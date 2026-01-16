create table if not exists public.app_settings (
  setting_key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.app_settings enable row level security;

drop policy if exists app_settings_select_authenticated on public.app_settings;
create policy app_settings_select_authenticated
on public.app_settings
for select
to authenticated
using (true);

drop policy if exists app_settings_write_admin on public.app_settings;
create policy app_settings_write_admin
on public.app_settings
for all
to authenticated
using (public.is_global_admin() or public.is_in_operator_group('it_services'))
with check (public.is_global_admin() or public.is_in_operator_group('it_services'));

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute procedure public.set_updated_at();

insert into public.app_settings (setting_key, value)
values (
  'system',
  jsonb_build_object(
    'support_email', '',
    'no_reply_email', '',
    'business_hours', jsonb_build_object(
      'start_time', '09:00',
      'end_time', '17:00',
      'working_days', jsonb_build_array('Mon','Tue','Wed','Thu','Fri')
    )
  )
)
on conflict (setting_key) do nothing;
