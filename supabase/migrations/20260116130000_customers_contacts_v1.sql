create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customers_domain_uq
on public.customers (lower(domain))
where domain is not null and domain <> '';

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute procedure public.set_updated_at();

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  email text,
  full_name text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_customer_id_idx on public.contacts (customer_id);
create index if not exists contacts_profile_id_idx on public.contacts (profile_id);
create index if not exists contacts_email_idx on public.contacts (lower(email));

create unique index if not exists contacts_customer_email_uq
on public.contacts (customer_id, lower(email))
where email is not null and email <> '';

drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at
before update on public.contacts
for each row execute procedure public.set_updated_at();

alter table public.tickets
  add column if not exists customer_id uuid references public.customers(id) on delete set null;

alter table public.tickets
  add column if not exists contact_id uuid references public.contacts(id) on delete set null;

create index if not exists tickets_customer_id_idx on public.tickets (customer_id);
create index if not exists tickets_contact_id_idx on public.tickets (contact_id);

alter table public.customers enable row level security;
alter table public.contacts enable row level security;

drop policy if exists customers_select on public.customers;
create policy customers_select
on public.customers
for select
to authenticated
using (
  public.is_global_admin()
  or public.can_work_tickets()
  or public.is_in_operator_group('customer_service')
);

drop policy if exists customers_admin_write on public.customers;
create policy customers_admin_write
on public.customers
for all
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

drop policy if exists contacts_select on public.contacts;
create policy contacts_select
on public.contacts
for select
to authenticated
using (
  public.is_global_admin()
  or public.can_work_tickets()
  or public.is_in_operator_group('customer_service')
);

drop policy if exists contacts_admin_write on public.contacts;
create policy contacts_admin_write
on public.contacts
for all
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());
