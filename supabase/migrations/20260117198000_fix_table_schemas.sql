-- Fix table schemas to match frontend expectations

-- ticket_time_entries: add missing columns
alter table public.ticket_time_entries
  add column if not exists duration_minutes integer,
  add column if not exists description text,
  add column if not exists work_date date not null default current_date;

-- Migrate existing data
update public.ticket_time_entries
set duration_minutes = minutes
where duration_minutes is null and minutes is not null;

update public.ticket_time_entries
set description = note
where description is null and note is not null;

-- ticket_approval_requests: add missing columns
alter table public.ticket_approval_requests
  add column if not exists approver_id uuid references public.profiles(id) on delete set null,
  add column if not exists request_reason text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

-- Migrate existing data
update public.ticket_approval_requests
set request_reason = notes
where request_reason is null and notes is not null;

-- Add trigger for updated_at on ticket_approval_requests
drop trigger if exists ticket_approval_requests_set_updated_at on public.ticket_approval_requests;
create trigger ticket_approval_requests_set_updated_at
before update on public.ticket_approval_requests
for each row execute procedure public.set_updated_at();
