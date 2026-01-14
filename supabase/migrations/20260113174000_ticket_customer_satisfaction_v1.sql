create extension if not exists pgcrypto;

create table if not exists public.ticket_customer_satisfaction (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating int2 not null check (rating between 1 and 5),
  comment text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ticket_id, user_id)
);

create index if not exists ticket_customer_satisfaction_ticket_id_idx on public.ticket_customer_satisfaction (ticket_id);
create index if not exists ticket_customer_satisfaction_user_id_idx on public.ticket_customer_satisfaction (user_id);

drop trigger if exists ticket_customer_satisfaction_set_updated_at on public.ticket_customer_satisfaction;
create trigger ticket_customer_satisfaction_set_updated_at
before update on public.ticket_customer_satisfaction
for each row execute procedure public.set_updated_at();

alter table public.ticket_customer_satisfaction enable row level security;

drop policy if exists ticket_customer_satisfaction_select on public.ticket_customer_satisfaction;
create policy ticket_customer_satisfaction_select
on public.ticket_customer_satisfaction
for select
to authenticated
using (true);

drop policy if exists ticket_customer_satisfaction_insert on public.ticket_customer_satisfaction;
create policy ticket_customer_satisfaction_insert
on public.ticket_customer_satisfaction
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists ticket_customer_satisfaction_update on public.ticket_customer_satisfaction;
create policy ticket_customer_satisfaction_update
on public.ticket_customer_satisfaction
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists ticket_customer_satisfaction_delete on public.ticket_customer_satisfaction;
create policy ticket_customer_satisfaction_delete
on public.ticket_customer_satisfaction
for delete
to authenticated
using (user_id = auth.uid());
