-- Ticket archiving v1

alter table public.tickets
  add column if not exists archived_at timestamptz;

create index if not exists tickets_archived_at_idx on public.tickets (archived_at);

create or replace function public.tickets_set_archived_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'closed' then
    if new.archived_at is null then
      new.archived_at := now();
    end if;
  else
    new.archived_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists tickets_set_archived_at on public.tickets;
create trigger tickets_set_archived_at
before insert or update of status
on public.tickets
for each row execute procedure public.tickets_set_archived_at();

update public.tickets
set archived_at = coalesce(archived_at, updated_at, created_at, now())
where status = 'closed'
  and archived_at is null;
