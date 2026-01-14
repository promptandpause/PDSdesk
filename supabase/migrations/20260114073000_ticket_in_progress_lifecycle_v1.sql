-- Ticket lifecycle automation v1: in_progress status + lifecycle timestamps + audit helpers

create extension if not exists pgcrypto;

-- 1) Add in_progress to enum
alter type public.ticket_status add value if not exists 'in_progress' after 'open';

-- 2) Lifecycle timestamps
alter table public.tickets
  add column if not exists resolved_at timestamptz,
  add column if not exists closed_at timestamptz;

create index if not exists tickets_resolved_at_idx on public.tickets (resolved_at);
create index if not exists tickets_closed_at_idx on public.tickets (closed_at);

-- Backfill timestamps
update public.tickets
set resolved_at = coalesce(resolved_at, updated_at, created_at, now())
where status = 'resolved'
  and resolved_at is null;

update public.tickets
set closed_at = coalesce(closed_at, archived_at, updated_at, created_at, now())
where status = 'closed'
  and closed_at is null;

-- 3) System audit events: allow null actor_id
alter table public.ticket_events
  alter column actor_id drop not null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'ticket_events_actor_id_fkey'
      and conrelid = 'public.ticket_events'::regclass
  ) then
    alter table public.ticket_events drop constraint ticket_events_actor_id_fkey;
  end if;
end
$$;

alter table public.ticket_events
  add constraint ticket_events_actor_id_fkey
  foreign key (actor_id) references public.profiles(id) on delete set null;

-- 4) Consolidate status-dependent timestamps (also replaces archived_at trigger)
create or replace function public.tickets_set_lifecycle_fields()
returns trigger
language plpgsql
as $$
declare
  old_status public.ticket_status;
begin
  old_status := null;
  if tg_op = 'UPDATE' then
    old_status := old.status;
  end if;

  -- resolved_at: set on transition into resolved; clear if leaving resolved back to active states
  if new.status = 'resolved' then
    if new.resolved_at is null then
      new.resolved_at := now();
    end if;
  elsif old_status = 'resolved' and new.status <> 'closed' then
    new.resolved_at := null;
  end if;

  -- closed_at + archived_at: set when closed, cleared otherwise
  if new.status = 'closed' then
    if new.closed_at is null then
      new.closed_at := now();
    end if;
    if new.archived_at is null then
      new.archived_at := now();
    end if;
  else
    new.closed_at := null;
    new.archived_at := null;
  end if;

  return new;
end;
$$;

-- Replace the old trigger from ticket_archiving_v1
-- (safe to drop even if it doesn't exist)
drop trigger if exists tickets_set_archived_at on public.tickets;
drop trigger if exists tickets_set_lifecycle_fields on public.tickets;
create trigger tickets_set_lifecycle_fields
before insert or update of status
on public.tickets
for each row execute procedure public.tickets_set_lifecycle_fields();

-- 5) Agent view: new -> open (and log audit event)
create or replace function public.ticket_mark_opened(p_ticket_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_id uuid;
begin
  if not (public.is_global_admin() or public.can_work_tickets() or public.is_in_operator_group('customer_service')) then
    raise exception 'forbidden';
  end if;

  update public.tickets
  set status = 'open'
  where id = p_ticket_id
    and status = 'new'
  returning id into updated_id;

  if updated_id is null then
    return false;
  end if;

  insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
  values (
    updated_id,
    auth.uid(),
    'ticket_status_changed',
    jsonb_build_object('from', 'new', 'to', 'open', 'reason', 'agent_viewed')
  );

  return true;
end;
$$;

-- 6) Agent comment: new/open/pending -> in_progress (and log audit event)
create or replace function public.tickets_auto_in_progress_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cur_status public.ticket_status;
  ttype text;
  is_agent boolean;
begin
  select t.status, t.ticket_type
    into cur_status, ttype
  from public.tickets t
  where t.id = new.ticket_id;

  if cur_status is null then
    return new;
  end if;

  is_agent := public.can_work_tickets();
  if not is_agent and ttype = 'customer_service' then
    is_agent := public.is_in_operator_group('customer_service');
  end if;

  if not is_agent then
    return new;
  end if;

  if cur_status in ('new', 'open', 'pending') then
    update public.tickets
    set status = 'in_progress'
    where id = new.ticket_id
      and status = cur_status;

    insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
    values (
      new.ticket_id,
      new.author_id,
      'ticket_status_changed',
      jsonb_build_object('from', cur_status::text, 'to', 'in_progress', 'reason', 'agent_comment', 'comment_id', new.id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists ticket_comments_auto_in_progress on public.ticket_comments;
create trigger ticket_comments_auto_in_progress
after insert on public.ticket_comments
for each row execute procedure public.tickets_auto_in_progress_on_comment();
