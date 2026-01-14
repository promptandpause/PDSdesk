-- Dashboard widgets + user report/selection definitions (v1)

create extension if not exists pgcrypto;

-- Widgets persisted per user
create table if not exists public.dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  widget_id text not null,
  position integer not null,
  size text not null default 'md',
  title text,
  subtitle text,
  is_hidden boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dashboard_widgets_user_widget_unique unique (user_id, widget_id)
);

create index if not exists dashboard_widgets_user_id_idx on public.dashboard_widgets (user_id);
create index if not exists dashboard_widgets_user_position_idx on public.dashboard_widgets (user_id, position);

drop trigger if exists dashboard_widgets_set_updated_at on public.dashboard_widgets;
create trigger dashboard_widgets_set_updated_at
before update on public.dashboard_widgets
for each row execute procedure public.set_updated_at();

-- Saved report definitions (lightweight, used by dashboard widgets)
create table if not exists public.saved_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  report_type text not null default 'builtin',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_reports_user_id_idx on public.saved_reports (user_id);

drop trigger if exists saved_reports_set_updated_at on public.saved_reports;
create trigger saved_reports_set_updated_at
before update on public.saved_reports
for each row execute procedure public.set_updated_at();

-- Saved selections (lightweight, used by dashboard widgets)
create table if not exists public.saved_selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  selection_type text not null default 'builtin',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_selections_user_id_idx on public.saved_selections (user_id);

drop trigger if exists saved_selections_set_updated_at on public.saved_selections;
create trigger saved_selections_set_updated_at
before update on public.saved_selections
for each row execute procedure public.set_updated_at();

-- RLS
alter table public.dashboard_widgets enable row level security;
alter table public.saved_reports enable row level security;
alter table public.saved_selections enable row level security;

-- dashboard_widgets policies
drop policy if exists dashboard_widgets_select_own on public.dashboard_widgets;
create policy dashboard_widgets_select_own
on public.dashboard_widgets
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists dashboard_widgets_insert_own on public.dashboard_widgets;
create policy dashboard_widgets_insert_own
on public.dashboard_widgets
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists dashboard_widgets_update_own on public.dashboard_widgets;
create policy dashboard_widgets_update_own
on public.dashboard_widgets
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists dashboard_widgets_delete_own on public.dashboard_widgets;
create policy dashboard_widgets_delete_own
on public.dashboard_widgets
for delete
to authenticated
using (user_id = auth.uid());

-- saved_reports policies
drop policy if exists saved_reports_select_own on public.saved_reports;
create policy saved_reports_select_own
on public.saved_reports
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists saved_reports_insert_own on public.saved_reports;
create policy saved_reports_insert_own
on public.saved_reports
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists saved_reports_update_own on public.saved_reports;
create policy saved_reports_update_own
on public.saved_reports
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists saved_reports_delete_own on public.saved_reports;
create policy saved_reports_delete_own
on public.saved_reports
for delete
to authenticated
using (user_id = auth.uid());

-- saved_selections policies
drop policy if exists saved_selections_select_own on public.saved_selections;
create policy saved_selections_select_own
on public.saved_selections
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists saved_selections_insert_own on public.saved_selections;
create policy saved_selections_insert_own
on public.saved_selections
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists saved_selections_update_own on public.saved_selections;
create policy saved_selections_update_own
on public.saved_selections
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists saved_selections_delete_own on public.saved_selections;
create policy saved_selections_delete_own
on public.saved_selections
for delete
to authenticated
using (user_id = auth.uid());

-- RPC: initialize defaults for a user if none exist
create or replace function public.ensure_default_dashboard_state()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists(select 1 from public.dashboard_widgets w where w.user_id = auth.uid()) then
    insert into public.dashboard_widgets (user_id, widget_id, position, size, title, subtitle, is_hidden, settings)
    values
      (auth.uid(), 'kpi', 0, 'md', 'KPI', null, false, '{"metrics": ["openTickets", "resolvedTickets", "assignedToMe"]}'::jsonb),
      (auth.uid(), 'report-main', 1, 'md', 'Service Desk', 'Ticket overview', false, '{"cards": ["totalTickets", "openTickets", "resolvedTickets", "customerSupport"]}'::jsonb),
      (auth.uid(), 'new', 2, 'sm', 'New', null, false, '{}'::jsonb),
      (auth.uid(), 'report-dual', 3, 'lg', 'Tasks', 'Ticket tasks status', false, '{"gauges": ["ticketTasksOpen", "ticketTasksCompleted"]}'::jsonb),
      (auth.uid(), 'reports', 4, 'sm', 'Reports list', null, false, '{"limit": 7}'::jsonb),
      (auth.uid(), 'selections', 5, 'lg', 'Selections', null, false, '{"limit": 5}'::jsonb);
  end if;

  if not exists(select 1 from public.saved_reports r where r.user_id = auth.uid()) then
    insert into public.saved_reports (user_id, name, report_type, config)
    values
      (auth.uid(), 'Ticket counts by status', 'builtin', '{"source": "v_ticket_counts_by_status"}'::jsonb),
      (auth.uid(), 'SLA overview (breaches first)', 'builtin', '{"source": "v_ticket_sla_overview"}'::jsonb),
      (auth.uid(), 'Tickets assigned to me', 'builtin', '{"source": "tickets", "filter": {"assignee": "me"}}'::jsonb);
  end if;

  if not exists(select 1 from public.saved_selections s where s.user_id = auth.uid()) then
    insert into public.saved_selections (user_id, name, selection_type, config)
    values
      (auth.uid(), 'My open tickets', 'builtin', '{"table": "tickets", "filter": {"assignee": "me", "status_in": ["new", "open", "pending"]}}'::jsonb),
      (auth.uid(), 'Customer support queue', 'builtin', '{"table": "tickets", "filter": {"ticket_type": "customer_service", "status_in": ["new", "open", "pending"]}}'::jsonb),
      (auth.uid(), 'Recently updated tickets', 'builtin', '{"table": "tickets", "sort": {"updated_at": "desc"}}'::jsonb);
  end if;
end;
$$;

grant execute on function public.ensure_default_dashboard_state() to authenticated;
