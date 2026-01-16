-- Kanban Boards and Planner Tasks

create extension if not exists pgcrypto;

-- Standalone tasks (Planner)
create table if not exists public.planner_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'todo',
  priority text not null default 'medium',
  assigned_to uuid references public.profiles(id) on delete set null,
  due_date timestamptz,
  tags text[] not null default '{}'::text[],
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists planner_tasks_assigned_to_idx on public.planner_tasks (assigned_to);
create index if not exists planner_tasks_status_idx on public.planner_tasks (status);
create index if not exists planner_tasks_due_date_idx on public.planner_tasks (due_date);

drop trigger if exists planner_tasks_set_updated_at on public.planner_tasks;
create trigger planner_tasks_set_updated_at
before update on public.planner_tasks
for each row execute procedure public.set_updated_at();

-- Kanban Boards
create table if not exists public.kanban_boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_shared boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kanban_boards_created_by_idx on public.kanban_boards (created_by);

drop trigger if exists kanban_boards_set_updated_at on public.kanban_boards;
create trigger kanban_boards_set_updated_at
before update on public.kanban_boards
for each row execute procedure public.set_updated_at();

-- Kanban Columns
create table if not exists public.kanban_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.kanban_boards(id) on delete cascade,
  name text not null,
  color text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists kanban_columns_board_id_idx on public.kanban_columns (board_id);

-- Kanban Cards
create table if not exists public.kanban_cards (
  id uuid primary key default gen_random_uuid(),
  column_id uuid not null references public.kanban_columns(id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 0,
  assigned_to uuid references public.profiles(id) on delete set null,
  due_date timestamptz,
  tags text[] not null default '{}'::text[],
  priority text not null default 'medium',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kanban_cards_column_id_idx on public.kanban_cards (column_id);
create index if not exists kanban_cards_assigned_to_idx on public.kanban_cards (assigned_to);

drop trigger if exists kanban_cards_set_updated_at on public.kanban_cards;
create trigger kanban_cards_set_updated_at
before update on public.kanban_cards
for each row execute procedure public.set_updated_at();

-- RLS
alter table public.planner_tasks enable row level security;
alter table public.kanban_boards enable row level security;
alter table public.kanban_columns enable row level security;
alter table public.kanban_cards enable row level security;

-- Planner tasks policies
drop policy if exists planner_tasks_select on public.planner_tasks;
create policy planner_tasks_select
on public.planner_tasks
for select
to authenticated
using (
  created_by = auth.uid()
  or assigned_to = auth.uid()
  or public.is_global_admin()
  or public.can_work_tickets()
);

drop policy if exists planner_tasks_insert on public.planner_tasks;
create policy planner_tasks_insert
on public.planner_tasks
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (public.is_global_admin() or public.can_work_tickets())
);

drop policy if exists planner_tasks_update on public.planner_tasks;
create policy planner_tasks_update
on public.planner_tasks
for update
to authenticated
using (
  created_by = auth.uid()
  or assigned_to = auth.uid()
  or public.is_global_admin()
)
with check (
  created_by = auth.uid()
  or assigned_to = auth.uid()
  or public.is_global_admin()
);

drop policy if exists planner_tasks_delete on public.planner_tasks;
create policy planner_tasks_delete
on public.planner_tasks
for delete
to authenticated
using (
  created_by = auth.uid()
  or public.is_global_admin()
);

-- Kanban boards policies
drop policy if exists kanban_boards_select on public.kanban_boards;
create policy kanban_boards_select
on public.kanban_boards
for select
to authenticated
using (
  created_by = auth.uid()
  or is_shared = true
  or public.is_global_admin()
);

drop policy if exists kanban_boards_insert on public.kanban_boards;
create policy kanban_boards_insert
on public.kanban_boards
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (public.is_global_admin() or public.can_work_tickets())
);

drop policy if exists kanban_boards_update on public.kanban_boards;
create policy kanban_boards_update
on public.kanban_boards
for update
to authenticated
using (created_by = auth.uid() or public.is_global_admin())
with check (created_by = auth.uid() or public.is_global_admin());

drop policy if exists kanban_boards_delete on public.kanban_boards;
create policy kanban_boards_delete
on public.kanban_boards
for delete
to authenticated
using (created_by = auth.uid() or public.is_global_admin());

-- Kanban columns policies (inherit from board access)
drop policy if exists kanban_columns_select on public.kanban_columns;
create policy kanban_columns_select
on public.kanban_columns
for select
to authenticated
using (
  exists(
    select 1 from public.kanban_boards b
    where b.id = kanban_columns.board_id
  )
);

drop policy if exists kanban_columns_insert on public.kanban_columns;
create policy kanban_columns_insert
on public.kanban_columns
for insert
to authenticated
with check (
  exists(
    select 1 from public.kanban_boards b
    where b.id = kanban_columns.board_id
      and (b.created_by = auth.uid() or public.is_global_admin())
  )
);

drop policy if exists kanban_columns_update on public.kanban_columns;
create policy kanban_columns_update
on public.kanban_columns
for update
to authenticated
using (
  exists(
    select 1 from public.kanban_boards b
    where b.id = kanban_columns.board_id
      and (b.created_by = auth.uid() or public.is_global_admin())
  )
);

drop policy if exists kanban_columns_delete on public.kanban_columns;
create policy kanban_columns_delete
on public.kanban_columns
for delete
to authenticated
using (
  exists(
    select 1 from public.kanban_boards b
    where b.id = kanban_columns.board_id
      and (b.created_by = auth.uid() or public.is_global_admin())
  )
);

-- Kanban cards policies (inherit from column/board access)
drop policy if exists kanban_cards_select on public.kanban_cards;
create policy kanban_cards_select
on public.kanban_cards
for select
to authenticated
using (
  exists(
    select 1 from public.kanban_columns c
    join public.kanban_boards b on b.id = c.board_id
    where c.id = kanban_cards.column_id
  )
);

drop policy if exists kanban_cards_insert on public.kanban_cards;
create policy kanban_cards_insert
on public.kanban_cards
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists(
    select 1 from public.kanban_columns c
    join public.kanban_boards b on b.id = c.board_id
    where c.id = kanban_cards.column_id
      and (b.created_by = auth.uid() or b.is_shared = true or public.is_global_admin())
  )
);

drop policy if exists kanban_cards_update on public.kanban_cards;
create policy kanban_cards_update
on public.kanban_cards
for update
to authenticated
using (
  created_by = auth.uid()
  or assigned_to = auth.uid()
  or exists(
    select 1 from public.kanban_columns c
    join public.kanban_boards b on b.id = c.board_id
    where c.id = kanban_cards.column_id
      and (b.created_by = auth.uid() or public.is_global_admin())
  )
);

drop policy if exists kanban_cards_delete on public.kanban_cards;
create policy kanban_cards_delete
on public.kanban_cards
for delete
to authenticated
using (
  created_by = auth.uid()
  or exists(
    select 1 from public.kanban_columns c
    join public.kanban_boards b on b.id = c.board_id
    where c.id = kanban_cards.column_id
      and (b.created_by = auth.uid() or public.is_global_admin())
  )
);
