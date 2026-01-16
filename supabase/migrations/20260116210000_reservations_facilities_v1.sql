-- Reservations & Facilities Booking v1
create extension if not exists pgcrypto;

-- Facilities/Resources that can be booked
create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  facility_type text not null default 'room',
  location text,
  capacity integer,
  amenities text[] not null default '{}',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists facilities_type_idx on public.facilities (facility_type);
create index if not exists facilities_active_idx on public.facilities (is_active);

drop trigger if exists facilities_set_updated_at on public.facilities;
create trigger facilities_set_updated_at
before update on public.facilities
for each row execute procedure public.set_updated_at();

-- Reservations/Bookings
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'confirmed',
  attendees text[] not null default '{}',
  recurrence_rule text,
  reserved_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservations_time_check check (end_time > start_time)
);

create index if not exists reservations_facility_id_idx on public.reservations (facility_id);
create index if not exists reservations_start_time_idx on public.reservations (start_time);
create index if not exists reservations_end_time_idx on public.reservations (end_time);
create index if not exists reservations_reserved_by_idx on public.reservations (reserved_by);
create index if not exists reservations_status_idx on public.reservations (status);

drop trigger if exists reservations_set_updated_at on public.reservations;
create trigger reservations_set_updated_at
before update on public.reservations
for each row execute procedure public.set_updated_at();

-- Function to check for overlapping reservations
create or replace function public.check_reservation_overlap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.reservations res
    where res.facility_id = NEW.facility_id
      and res.id <> coalesce(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and res.status <> 'cancelled'
      and NEW.status <> 'cancelled'
      and res.start_time < NEW.end_time
      and res.end_time > NEW.start_time
  ) then
    raise exception 'Reservation overlaps with existing booking';
  end if;
  return NEW;
end;
$$;

drop trigger if exists reservations_check_overlap on public.reservations;
create trigger reservations_check_overlap
before insert or update on public.reservations
for each row execute procedure public.check_reservation_overlap();

-- RLS Policies
alter table public.facilities enable row level security;
alter table public.reservations enable row level security;

-- Facilities: everyone can view active, admins can manage
drop policy if exists facilities_select on public.facilities;
create policy facilities_select
on public.facilities
for select
to authenticated
using (is_active = true or public.is_global_admin());

drop policy if exists facilities_insert on public.facilities;
create policy facilities_insert
on public.facilities
for insert
to authenticated
with check (
  public.is_global_admin()
  and created_by = auth.uid()
);

drop policy if exists facilities_update on public.facilities;
create policy facilities_update
on public.facilities
for update
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

drop policy if exists facilities_delete on public.facilities;
create policy facilities_delete
on public.facilities
for delete
to authenticated
using (public.is_global_admin());

-- Reservations: users can view all, manage their own
drop policy if exists reservations_select on public.reservations;
create policy reservations_select
on public.reservations
for select
to authenticated
using (true);

drop policy if exists reservations_insert on public.reservations;
create policy reservations_insert
on public.reservations
for insert
to authenticated
with check (
  reserved_by = auth.uid()
  and exists(
    select 1
    from public.facilities f
    where f.id = reservations.facility_id
      and f.is_active = true
  )
);

drop policy if exists reservations_update on public.reservations;
create policy reservations_update
on public.reservations
for update
to authenticated
using (reserved_by = auth.uid() or public.is_global_admin())
with check (reserved_by = auth.uid() or public.is_global_admin());

drop policy if exists reservations_delete on public.reservations;
create policy reservations_delete
on public.reservations
for delete
to authenticated
using (reserved_by = auth.uid() or public.is_global_admin());

-- Seed some default facilities (only if an admin exists)
insert into public.facilities (name, description, facility_type, location, capacity, amenities, created_by)
select
  'Conference Room A',
  'Large conference room with video conferencing',
  'room',
  'Building 1, Floor 2',
  20,
  array['projector', 'whiteboard', 'video_conferencing', 'phone'],
  p.id
from public.profiles p
where exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.role_key = 'global_admin')
limit 1
on conflict do nothing;

insert into public.facilities (name, description, facility_type, location, capacity, amenities, created_by)
select
  'Meeting Room B',
  'Small meeting room for quick huddles',
  'room',
  'Building 1, Floor 1',
  6,
  array['whiteboard', 'tv_display'],
  p.id
from public.profiles p
where exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.role_key = 'global_admin')
limit 1
on conflict do nothing;

insert into public.facilities (name, description, facility_type, location, capacity, amenities, created_by)
select
  'Company Vehicle - Van',
  'Company van for team transport',
  'vehicle',
  'Parking Lot A',
  8,
  array['gps', 'bluetooth'],
  p.id
from public.profiles p
where exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.role_key = 'global_admin')
limit 1
on conflict do nothing;
