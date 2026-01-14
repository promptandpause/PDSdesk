create extension if not exists pgcrypto;

create table if not exists public.ticket_links (
  id uuid primary key default gen_random_uuid(),
  from_ticket_id uuid not null references public.tickets(id) on delete cascade,
  to_ticket_id uuid not null references public.tickets(id) on delete cascade,
  link_type text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint ticket_links_not_self check (from_ticket_id <> to_ticket_id)
);

create unique index if not exists ticket_links_unique
on public.ticket_links (from_ticket_id, to_ticket_id, link_type);

create index if not exists ticket_links_from_ticket_id_idx on public.ticket_links (from_ticket_id);
create index if not exists ticket_links_to_ticket_id_idx on public.ticket_links (to_ticket_id);
create index if not exists ticket_links_link_type_idx on public.ticket_links (link_type);

alter table public.ticket_links enable row level security;

drop policy if exists ticket_links_select on public.ticket_links;
create policy ticket_links_select
on public.ticket_links
for select
to authenticated
using (
  exists(
    select 1
    from public.tickets t1
    where t1.id = ticket_links.from_ticket_id
  )
  and exists(
    select 1
    from public.tickets t2
    where t2.id = ticket_links.to_ticket_id
  )
);

drop policy if exists ticket_links_insert on public.ticket_links;
create policy ticket_links_insert
on public.ticket_links
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    public.is_global_admin()
    or exists(
      select 1
      from public.tickets t1
      join public.tickets t2 on t2.id = ticket_links.to_ticket_id
      where t1.id = ticket_links.from_ticket_id
        and (
          (t1.ticket_type = 'customer_service' or t2.ticket_type = 'customer_service')
            and public.is_in_operator_group('customer_service')
          or (t1.ticket_type <> 'customer_service' and t2.ticket_type <> 'customer_service')
            and public.can_work_tickets()
        )
    )
  )
);

drop policy if exists ticket_links_delete on public.ticket_links;
create policy ticket_links_delete
on public.ticket_links
for delete
to authenticated
using (
  public.is_global_admin()
  or exists(
    select 1
    from public.tickets t1
    join public.tickets t2 on t2.id = ticket_links.to_ticket_id
    where t1.id = ticket_links.from_ticket_id
      and (
        (t1.ticket_type = 'customer_service' or t2.ticket_type = 'customer_service')
          and public.is_in_operator_group('customer_service')
        or (t1.ticket_type <> 'customer_service' and t2.ticket_type <> 'customer_service')
          and public.can_work_tickets()
      )
  )
);
