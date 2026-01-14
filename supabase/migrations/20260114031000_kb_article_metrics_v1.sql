create table if not exists public.knowledge_article_likes (
  article_id uuid not null references public.knowledge_articles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, user_id)
);

create index if not exists knowledge_article_likes_article_id_idx on public.knowledge_article_likes (article_id);

alter table public.knowledge_articles
  add column if not exists category text,
  add column if not exists view_count int not null default 0,
  add column if not exists like_count int not null default 0,
  add column if not exists published_at timestamptz;

create index if not exists knowledge_articles_category_idx on public.knowledge_articles (category);
create index if not exists knowledge_articles_updated_at_idx on public.knowledge_articles (updated_at desc);

alter table public.knowledge_article_likes enable row level security;

drop policy if exists knowledge_article_likes_select on public.knowledge_article_likes;
create policy knowledge_article_likes_select
on public.knowledge_article_likes
for select
to authenticated
using (
  exists(
    select 1
    from public.knowledge_articles a
    where a.id = knowledge_article_likes.article_id
  )
);

drop policy if exists knowledge_article_likes_insert on public.knowledge_article_likes;
create policy knowledge_article_likes_insert
on public.knowledge_article_likes
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists(
    select 1
    from public.knowledge_articles a
    where a.id = knowledge_article_likes.article_id
  )
);

drop policy if exists knowledge_article_likes_delete on public.knowledge_article_likes;
create policy knowledge_article_likes_delete
on public.knowledge_article_likes
for delete
to authenticated
using (user_id = auth.uid());
