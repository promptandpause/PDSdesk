alter table public.tickets
  add column if not exists external_number text;

create index if not exists tickets_external_number_idx on public.tickets (external_number);
