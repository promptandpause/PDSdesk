-- Ticket ratings and notification preferences
-- Enables requesters to rate agent performance and manage notification preferences

-- Ticket ratings table
create table if not exists public.ticket_ratings (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  feedback text,
  rated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(ticket_id, rated_by)
);

-- Index for performance
create index if not exists ticket_ratings_ticket_id_idx on public.ticket_ratings(ticket_id);
create index if not exists ticket_ratings_rated_by_idx on public.ticket_ratings(rated_by);

-- User notification preferences
create table if not exists public.user_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  email_ticket_created boolean not null default true,
  email_ticket_updated boolean not null default true,
  email_ticket_resolved boolean not null default true,
  email_ticket_closed boolean not null default true,
  inapp_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- Trigger to create default notification preferences for new users
create or replace function public.create_default_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Add trigger to create notification preferences for new profiles
drop trigger if exists create_notification_preferences_trigger on public.profiles;
create trigger create_notification_preferences_trigger
after insert on public.profiles
for each row execute procedure public.create_default_notification_preferences();

-- RLS for ticket ratings
alter table public.ticket_ratings enable row level security;

drop policy if exists ticket_ratings_select on public.ticket_ratings;
create policy ticket_ratings_select
on public.ticket_ratings
for select
to authenticated
using (
  -- Users can see ratings for their own tickets
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_ratings.ticket_id
      and t.requester_id = auth.uid()
  )
  -- Users can see ratings they gave
  or ticket_ratings.rated_by = auth.uid()
  -- Global admins can see all ratings
  or public.is_global_admin()
);

drop policy if exists ticket_ratings_insert on public.ticket_ratings;
create policy ticket_ratings_insert
on public.ticket_ratings
for insert
to authenticated
with check (
  -- Users can only rate their own tickets
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_ratings.ticket_id
      and t.requester_id = auth.uid()
  )
  -- Must be the requester
  and ticket_ratings.rated_by = auth.uid()
);

-- RLS for notification preferences
alter table public.user_notification_preferences enable row level security;

drop policy if exists user_notification_preferences_select on public.user_notification_preferences;
create policy user_notification_preferences_select
on public.user_notification_preferences
for select
to authenticated
using (user_id = auth.uid() or public.is_global_admin());

drop policy if exists user_notification_preferences_update on public.user_notification_preferences;
create policy user_notification_preferences_update
on public.user_notification_preferences
for update
to authenticated
using (user_id = auth.uid() or public.is_global_admin())
with check (user_id = auth.uid() or public.is_global_admin());

-- Function to check if user wants email notifications
create or replace function public.wants_email_notification(
  p_user_id uuid,
  p_notification_type text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pref record;
begin
  select * into v_pref
  from public.user_notification_preferences
  where user_id = p_user_id;
  
  if v_pref is null then
    -- Default to true if no preferences set
    return true;
  end if;
  
  case p_notification_type
    when 'ticket_created' then return v_pref.email_ticket_created;
    when 'ticket_updated' then return v_pref.email_ticket_updated;
    when 'ticket_resolved' then return v_pref.email_ticket_resolved;
    when 'ticket_closed' then return v_pref.email_ticket_closed;
    else return true;
  end case;
end;
$$;
