alter table public.customers enable row level security;
alter table public.contacts enable row level security;

drop policy if exists customers_select on public.customers;
create policy customers_select
on public.customers
for select
to authenticated
using (public.is_global_admin() or public.has_role('service_desk_admin'));

drop policy if exists customers_admin_write on public.customers;
create policy customers_admin_write
on public.customers
for all
to authenticated
using (public.is_global_admin() or public.has_role('service_desk_admin'))
with check (public.is_global_admin() or public.has_role('service_desk_admin'));

drop policy if exists contacts_select on public.contacts;
create policy contacts_select
on public.contacts
for select
to authenticated
using (public.is_global_admin() or public.has_role('service_desk_admin'));

drop policy if exists contacts_admin_write on public.contacts;
create policy contacts_admin_write
on public.contacts
for all
to authenticated
using (public.is_global_admin() or public.has_role('service_desk_admin'))
with check (public.is_global_admin() or public.has_role('service_desk_admin'));
