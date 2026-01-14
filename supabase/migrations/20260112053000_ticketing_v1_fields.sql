-- Ticketing v1 follow-up fields (remove UI placeholders)

create extension if not exists pgcrypto;

create sequence if not exists public.ticket_number_seq;

create or replace function public.next_ticket_number()
returns text
language sql
volatile
security definer
set search_path = public
as $$
  select 'T-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.ticket_number_seq')::text, 6, '0');
$$;

alter table public.tickets
  add column if not exists ticket_number text;

alter table public.tickets
  add column if not exists category text not null default 'General';

alter table public.tickets
  add column if not exists due_at timestamptz;

-- Backfill existing rows
update public.tickets
set ticket_number = public.next_ticket_number()
where ticket_number is null or ticket_number = '';

update public.tickets
set due_at = now() + interval '2 days'
where due_at is null;

-- Enforce required fields
alter table public.tickets
  alter column ticket_number set not null;

alter table public.tickets
  alter column due_at set not null;

create unique index if not exists tickets_ticket_number_uq on public.tickets (ticket_number);

create or replace function public.tickets_set_ticket_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.ticket_number is null or new.ticket_number = '' then
    new.ticket_number := public.next_ticket_number();
  end if;
  if new.due_at is null then
    new.due_at := now() + interval '2 days';
  end if;
  if new.category is null or new.category = '' then
    new.category := 'General';
  end if;
  return new;
end;
$$;

drop trigger if exists tickets_set_ticket_number on public.tickets;
create trigger tickets_set_ticket_number
before insert on public.tickets
for each row execute procedure public.tickets_set_ticket_number();
