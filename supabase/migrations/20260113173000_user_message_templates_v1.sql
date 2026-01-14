create extension if not exists pgcrypto;

create table if not exists public.user_message_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_message_templates_user_id_idx on public.user_message_templates (user_id);
create index if not exists user_message_templates_updated_at_idx on public.user_message_templates (updated_at desc);

drop trigger if exists user_message_templates_set_updated_at on public.user_message_templates;
create trigger user_message_templates_set_updated_at
before update on public.user_message_templates
for each row execute procedure public.set_updated_at();

alter table public.user_message_templates enable row level security;

drop policy if exists user_message_templates_select on public.user_message_templates;
create policy user_message_templates_select
on public.user_message_templates
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists user_message_templates_insert on public.user_message_templates;
create policy user_message_templates_insert
on public.user_message_templates
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists user_message_templates_update on public.user_message_templates;
create policy user_message_templates_update
on public.user_message_templates
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists user_message_templates_delete on public.user_message_templates;
create policy user_message_templates_delete
on public.user_message_templates
for delete
to authenticated
using (user_id = auth.uid());
