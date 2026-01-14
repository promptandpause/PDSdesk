create extension if not exists pgcrypto;

create table if not exists public.service_catalog_items (
  id uuid primary key default gen_random_uuid(),
  item_key text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  default_ticket_type text not null default 'itsm_incident',
  default_category text,
  default_priority text,
  assignment_group_id uuid references public.operator_groups(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists service_catalog_items_active_idx on public.service_catalog_items (is_active);

create table if not exists public.service_catalog_item_fields (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.service_catalog_items(id) on delete cascade,
  field_key text not null,
  label text not null,
  field_type text not null default 'text',
  is_required boolean not null default false,
  options jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (item_id, field_key)
);

create index if not exists service_catalog_item_fields_item_id_idx on public.service_catalog_item_fields (item_id);

create table if not exists public.ticket_service_request_items (
  ticket_id uuid primary key references public.tickets(id) on delete cascade,
  catalog_item_id uuid references public.service_catalog_items(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_service_request_item_values (
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  field_id uuid not null references public.service_catalog_item_fields(id) on delete cascade,
  value_text text,
  value_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (ticket_id, field_id)
);

drop trigger if exists ticket_service_request_item_values_set_updated_at on public.ticket_service_request_item_values;
create trigger ticket_service_request_item_values_set_updated_at
before update on public.ticket_service_request_item_values
for each row execute procedure public.set_updated_at();

alter table public.service_catalog_items enable row level security;
alter table public.service_catalog_item_fields enable row level security;
alter table public.ticket_service_request_items enable row level security;
alter table public.ticket_service_request_item_values enable row level security;

drop policy if exists service_catalog_items_select on public.service_catalog_items;
create policy service_catalog_items_select
on public.service_catalog_items
for select
to authenticated
using (is_active = true or public.is_global_admin());

drop policy if exists service_catalog_items_admin_write on public.service_catalog_items;
create policy service_catalog_items_admin_write
on public.service_catalog_items
for all
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

drop policy if exists service_catalog_item_fields_select on public.service_catalog_item_fields;
create policy service_catalog_item_fields_select
on public.service_catalog_item_fields
for select
to authenticated
using (
  exists(
    select 1
    from public.service_catalog_items i
    where i.id = service_catalog_item_fields.item_id
      and (i.is_active = true or public.is_global_admin())
  )
);

drop policy if exists service_catalog_item_fields_admin_write on public.service_catalog_item_fields;
create policy service_catalog_item_fields_admin_write
on public.service_catalog_item_fields
for all
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

drop policy if exists ticket_service_request_items_select on public.ticket_service_request_items;
create policy ticket_service_request_items_select
on public.ticket_service_request_items
for select
to authenticated
using (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_service_request_items.ticket_id
  )
);

drop policy if exists ticket_service_request_items_insert on public.ticket_service_request_items;
create policy ticket_service_request_items_insert
on public.ticket_service_request_items
for insert
to authenticated
with check (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_service_request_items.ticket_id
      and (
        public.is_global_admin()
        or (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_service_request_items_delete on public.ticket_service_request_items;
create policy ticket_service_request_items_delete
on public.ticket_service_request_items
for delete
to authenticated
using (public.is_global_admin());

drop policy if exists ticket_service_request_item_values_select on public.ticket_service_request_item_values;
create policy ticket_service_request_item_values_select
on public.ticket_service_request_item_values
for select
to authenticated
using (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_service_request_item_values.ticket_id
  )
);

drop policy if exists ticket_service_request_item_values_insert on public.ticket_service_request_item_values;
create policy ticket_service_request_item_values_insert
on public.ticket_service_request_item_values
for insert
to authenticated
with check (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_service_request_item_values.ticket_id
      and (
        public.is_global_admin()
        or (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_service_request_item_values_update on public.ticket_service_request_item_values;
create policy ticket_service_request_item_values_update
on public.ticket_service_request_item_values
for update
to authenticated
using (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_service_request_item_values.ticket_id
      and (
        public.is_global_admin()
        or (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
)
with check (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_service_request_item_values.ticket_id
      and (
        public.is_global_admin()
        or (t.ticket_type <> 'customer_service' and public.can_work_tickets())
        or (t.ticket_type = 'customer_service' and public.is_in_operator_group('customer_service'))
      )
  )
);

drop policy if exists ticket_service_request_item_values_delete on public.ticket_service_request_item_values;
create policy ticket_service_request_item_values_delete
on public.ticket_service_request_item_values
for delete
to authenticated
using (public.is_global_admin());

insert into public.service_catalog_items (item_key, name, description, default_ticket_type, default_category, default_priority)
values
  ('new_laptop', 'Request a new laptop', 'Request a new laptop for an employee', 'itsm_incident', 'IT Services', 'medium'),
  ('access_request', 'Access request', 'Request access to systems', 'itsm_incident', 'IT Services', 'medium')
on conflict (item_key) do nothing;
