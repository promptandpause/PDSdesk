create extension if not exists pgcrypto;

create table if not exists public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  body text not null,
  status text not null default 'draft',
  tags text[] not null default '{}'::text[],
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists knowledge_articles_slug_uq on public.knowledge_articles (slug);
create index if not exists knowledge_articles_status_idx on public.knowledge_articles (status);

drop trigger if exists knowledge_articles_set_updated_at on public.knowledge_articles;
create trigger knowledge_articles_set_updated_at
before update on public.knowledge_articles
for each row execute procedure public.set_updated_at();

create table if not exists public.ticket_knowledge_articles (
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  article_id uuid not null references public.knowledge_articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (ticket_id, article_id)
);

create index if not exists ticket_knowledge_articles_article_id_idx on public.ticket_knowledge_articles (article_id);

alter table public.knowledge_articles enable row level security;
alter table public.ticket_knowledge_articles enable row level security;

drop policy if exists knowledge_articles_select on public.knowledge_articles;
create policy knowledge_articles_select
on public.knowledge_articles
for select
to authenticated
using (
  status = 'published'
  or public.is_global_admin()
  or public.can_work_tickets()
  or public.is_in_operator_group('customer_service')
);

drop policy if exists knowledge_articles_insert on public.knowledge_articles;
create policy knowledge_articles_insert
on public.knowledge_articles
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (public.is_global_admin() or public.can_work_tickets() or public.is_in_operator_group('customer_service'))
);

drop policy if exists knowledge_articles_update on public.knowledge_articles;
create policy knowledge_articles_update
on public.knowledge_articles
for update
to authenticated
using (public.is_global_admin() or public.can_work_tickets() or public.is_in_operator_group('customer_service'))
with check (public.is_global_admin() or public.can_work_tickets() or public.is_in_operator_group('customer_service'));

drop policy if exists knowledge_articles_delete on public.knowledge_articles;
create policy knowledge_articles_delete
on public.knowledge_articles
for delete
to authenticated
using (public.is_global_admin());

drop policy if exists ticket_knowledge_articles_select on public.ticket_knowledge_articles;
create policy ticket_knowledge_articles_select
on public.ticket_knowledge_articles
for select
to authenticated
using (
  exists(
    select 1
    from public.tickets t
    where t.id = ticket_knowledge_articles.ticket_id
  )
);

drop policy if exists ticket_knowledge_articles_insert on public.ticket_knowledge_articles;
create policy ticket_knowledge_articles_insert
on public.ticket_knowledge_articles
for insert
to authenticated
with check (
  (public.is_global_admin() or public.can_work_tickets() or public.is_in_operator_group('customer_service'))
  and exists(
    select 1
    from public.tickets t
    where t.id = ticket_knowledge_articles.ticket_id
  )
);

drop policy if exists ticket_knowledge_articles_delete on public.ticket_knowledge_articles;
create policy ticket_knowledge_articles_delete
on public.ticket_knowledge_articles
for delete
to authenticated
using (
  (public.is_global_admin() or public.can_work_tickets() or public.is_in_operator_group('customer_service'))
  and exists(
    select 1
    from public.tickets t
    where t.id = ticket_knowledge_articles.ticket_id
  )
);
