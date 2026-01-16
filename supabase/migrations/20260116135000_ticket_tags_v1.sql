create extension if not exists pgcrypto;

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tags_name_uq on public.tags (lower(name));

drop trigger if exists tags_set_updated_at on public.tags;
create trigger tags_set_updated_at
before update on public.tags
for each row execute procedure public.set_updated_at();

create table if not exists public.ticket_tags (
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (ticket_id, tag_id)
);

create index if not exists ticket_tags_tag_id_idx on public.ticket_tags (tag_id);

alter table public.tags enable row level security;
alter table public.ticket_tags enable row level security;

drop policy if exists tags_select on public.tags;
create policy tags_select
on public.tags
for select
to authenticated
using (true);

drop policy if exists tags_write_admin on public.tags;
create policy tags_write_admin
on public.tags
for all
to authenticated
using (public.is_global_admin() or public.has_role('service_desk_admin'))
with check (public.is_global_admin() or public.has_role('service_desk_admin'));

drop policy if exists ticket_tags_select on public.ticket_tags;
create policy ticket_tags_select
on public.ticket_tags
for select
to authenticated
using (
  public.is_global_admin()
  or public.can_work_tickets()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_tags.ticket_id
      and t.ticket_type = 'customer_service'
      and public.is_in_operator_group('customer_service')
  )
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_tags.ticket_id
      and (t.requester_id = auth.uid() or t.assignee_id = auth.uid() or t.created_by = auth.uid())
  )
);

drop policy if exists ticket_tags_insert on public.ticket_tags;
create policy ticket_tags_insert
on public.ticket_tags
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    public.is_global_admin()
    or public.can_work_tickets()
    or exists(
      select 1
      from public.tickets t
      where t.id = ticket_tags.ticket_id
        and t.ticket_type = 'customer_service'
        and public.is_in_operator_group('customer_service')
    )
  )
);

drop policy if exists ticket_tags_delete on public.ticket_tags;
create policy ticket_tags_delete
on public.ticket_tags
for delete
to authenticated
using (
  public.is_global_admin()
  or public.can_work_tickets()
  or exists(
    select 1
    from public.tickets t
    where t.id = ticket_tags.ticket_id
      and t.ticket_type = 'customer_service'
      and public.is_in_operator_group('customer_service')
  )
);
