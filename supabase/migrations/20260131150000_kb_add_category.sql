-- Add category column to knowledge_articles table
alter table public.knowledge_articles add column if not exists category text;

-- Create index for category filtering
create index if not exists knowledge_articles_category_idx on public.knowledge_articles (category);
