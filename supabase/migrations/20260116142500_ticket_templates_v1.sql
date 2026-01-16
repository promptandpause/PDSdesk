create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ticket_template_visibility') then
    create type public.ticket_template_visibility as enum ('private', 'global');
  end if;
end
$$;

create table if not exists public.ticket_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  visibility public.ticket_template_visibility not null default 'private',
  name text not null,
  defaults jsonb not null default '{}'::jsonb,
  form_schema jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ticket_templates_user_name_uq unique (user_id, name)
);

drop trigger if exists ticket_templates_set_updated_at on public.ticket_templates;
create trigger ticket_templates_set_updated_at
before update on public.ticket_templates
for each row execute procedure public.set_updated_at();

alter table public.ticket_templates enable row level security;

drop policy if exists ticket_templates_select on public.ticket_templates;
create policy ticket_templates_select
on public.ticket_templates
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    visibility = 'global'
    and (public.is_global_admin() or public.can_work_tickets() or public.is_in_operator_group('customer_service'))
  )
);

drop policy if exists ticket_templates_insert on public.ticket_templates;
create policy ticket_templates_insert
on public.ticket_templates
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

drop policy if exists ticket_templates_update on public.ticket_templates;
create policy ticket_templates_update
on public.ticket_templates
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

drop policy if exists ticket_templates_delete on public.ticket_templates;
create policy ticket_templates_delete
on public.ticket_templates
for delete
to authenticated
using (user_id = auth.uid() or public.is_global_admin() or public.has_role('service_desk_admin'));
