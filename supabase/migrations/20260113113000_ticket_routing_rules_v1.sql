create extension if not exists pgcrypto;

create table if not exists public.ticket_routing_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  is_active boolean not null default true,
  priority int not null default 100,
  match_mailbox text,
  match_ticket_type text,
  match_category text,
  assignment_group_id uuid references public.operator_groups(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ticket_routing_rules_active_priority_idx
on public.ticket_routing_rules (is_active, priority);

create index if not exists ticket_routing_rules_match_idx
on public.ticket_routing_rules (match_mailbox, match_ticket_type, match_category);

insert into public.ticket_routing_rules (rule_key, priority, match_ticket_type, match_mailbox, assignment_group_id)
select
  'customer_service_support_mailbox',
  10,
  'customer_service',
  'support@promptandpause.com',
  og.id
from public.operator_groups og
where og.group_key = 'customer_service'
on conflict (rule_key) do nothing;

insert into public.ticket_routing_rules (rule_key, priority, match_ticket_type, assignment_group_id)
select
  'it_services_default',
  50,
  'itsm_incident',
  og.id
from public.operator_groups og
where og.group_key = 'it_services'
on conflict (rule_key) do nothing;

create or replace function public.tickets_apply_routing_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  if new.assignment_group_id is not null then
    return new;
  end if;

  select r.assignment_group_id
  into v_group_id
  from public.ticket_routing_rules r
  where r.is_active = true
    and (r.assignment_group_id is not null)
    and (r.match_ticket_type is null or lower(r.match_ticket_type) = lower(coalesce(new.ticket_type, '')))
    and (r.match_mailbox is null or lower(r.match_mailbox) = lower(coalesce(new.mailbox, '')))
    and (r.match_category is null or lower(r.match_category) = lower(coalesce(new.category, '')))
  order by r.priority asc
  limit 1;

  if v_group_id is not null then
    new.assignment_group_id := v_group_id;
  end if;

  return new;
end;
$$;

drop trigger if exists tickets_z_apply_routing_rules on public.tickets;
create trigger tickets_z_apply_routing_rules
before insert on public.tickets
for each row execute procedure public.tickets_apply_routing_rules();

alter table public.ticket_routing_rules enable row level security;

drop policy if exists ticket_routing_rules_select on public.ticket_routing_rules;
create policy ticket_routing_rules_select
on public.ticket_routing_rules
for select
to authenticated
using (true);

drop policy if exists ticket_routing_rules_admin_write on public.ticket_routing_rules;
create policy ticket_routing_rules_admin_write
on public.ticket_routing_rules
for all
to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());
