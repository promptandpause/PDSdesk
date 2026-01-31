-- KB Categories table for admin-managed categories
create table if not exists public.kb_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  icon_name text, -- stores the icon component name (e.g., 'RocketIcon', 'WrenchIcon')
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insert default workplace-focused categories
insert into public.kb_categories (name, description, icon_name, display_order) values
  ('Onboarding', 'New employee guides and getting started resources', 'RocketIcon', 1),
  ('IT Support', 'Technical support and troubleshooting guides', 'WrenchIcon', 2),
  ('How-to Guides', 'Step-by-step procedures and instructions', 'BookOpenIcon', 3),
  ('FAQ', 'Frequently asked questions and answers', 'HelpCircleIcon', 4),
  ('Policies & Compliance', 'Company policies, rules, and compliance information', 'ScrollTextIcon', 5),
  ('Security & Access', 'Security guidelines, password help, and access management', 'ShieldIcon', 6),
  ('HR & Benefits', 'Human resources information and employee benefits', 'UserIcon', 7),
  ('Software & Tools', 'Application guides and software documentation', 'LaptopIcon', 8)
on conflict (name) do nothing;

-- Trigger for updated_at
drop trigger if exists kb_categories_set_updated_at on public.kb_categories;
create trigger kb_categories_set_updated_at
before update on public.kb_categories
for each row execute procedure public.set_updated_at();

-- Enable RLS
alter table public.kb_categories enable row level security;

-- Everyone can read active categories
drop policy if exists kb_categories_select on public.kb_categories;
create policy kb_categories_select
on public.kb_categories
for select
to authenticated
using (true);

-- Only admins can manage categories
drop policy if exists kb_categories_insert on public.kb_categories;
create policy kb_categories_insert
on public.kb_categories
for insert
to authenticated
with check (public.is_global_admin() or public.has_role('service_desk_admin'));

drop policy if exists kb_categories_update on public.kb_categories;
create policy kb_categories_update
on public.kb_categories
for update
to authenticated
using (public.is_global_admin() or public.has_role('service_desk_admin'))
with check (public.is_global_admin() or public.has_role('service_desk_admin'));

drop policy if exists kb_categories_delete on public.kb_categories;
create policy kb_categories_delete
on public.kb_categories
for delete
to authenticated
using (public.is_global_admin());
