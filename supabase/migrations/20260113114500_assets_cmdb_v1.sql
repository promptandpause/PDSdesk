create extension if not exists pgcrypto;

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_tag text not null,
  name text not null,
  asset_type text,
  status text not null default 'active',
  serial_number text,
  model text,
  manufacturer text,
  purchased_at timestamptz,
  warranty_expires_at timestamptz,
  assigned_user_id uuid references public.profiles(id) on delete set null,
  location text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists assets_asset_tag_uq on public.assets (asset_tag);
create index if not exists assets_assigned_user_id_idx on public.assets (assigned_user_id);
create index if not exists assets_status_idx on public.assets (status);

drop trigger if exists assets_set_updated_at on public.assets;
create trigger assets_set_updated_at
before update on public.assets
for each row execute procedure public.set_updated_at();

create table if not exists public.ticket_assets (
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  relationship text not null default 'affected',
  created_at timestamptz not null default now(),
  primary key (ticket_id, asset_id)
);

create index if not exists ticket_assets_asset_id_idx on public.ticket_assets (asset_id);

alter table public.assets enable row level security;
alter table public.ticket_assets enable row level security;

drop policy if exists assets_select on public.assets;
create policy assets_select
on public.assets
for select
to authenticated
using (
  public.is_global_admin()
  or public.can_work_tickets()
);

drop policy if exists assets_insert on public.assets;
create policy assets_insert
on public.assets
for insert
to authenticated
with check (
  public.is_global_admin()
  or public.can_work_tickets()
);

drop policy if exists assets_update on public.assets;
create policy assets_update
on public.assets
for update
to authenticated
using (
  public.is_global_admin()
  or public.can_work_tickets()
)
with check (
  public.is_global_admin()
  or public.can_work_tickets()
);

drop policy if exists assets_delete on public.assets;
create policy assets_delete
on public.assets
for delete
to authenticated
using (
  public.is_global_admin()
);

drop policy if exists ticket_assets_select on public.ticket_assets;
create policy ticket_assets_select
on public.ticket_assets
for select
to authenticated
using (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_assets.ticket_id
  )
);

drop policy if exists ticket_assets_insert on public.ticket_assets;
create policy ticket_assets_insert
on public.ticket_assets
for insert
to authenticated
with check (
  (public.is_global_admin() or public.can_work_tickets())
  and exists(
    select 1
    from public.tickets t
    where t.id = ticket_assets.ticket_id
  )
);

drop policy if exists ticket_assets_delete on public.ticket_assets;
create policy ticket_assets_delete
on public.ticket_assets
for delete
to authenticated
using (
  (public.is_global_admin() or public.can_work_tickets())
  and exists(
    select 1
    from public.tickets t
    where t.id = ticket_assets.ticket_id
  )
);
