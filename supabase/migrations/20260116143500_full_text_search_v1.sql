alter table public.tickets
  add column if not exists search_tsv tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(ticket_number, '') || ' ' ||
      coalesce(external_number, '') || ' ' ||
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(category, '') || ' ' ||
      coalesce(requester_email, '') || ' ' ||
      coalesce(requester_name, '')
    )
  ) stored;

create index if not exists tickets_search_tsv_idx on public.tickets using gin (search_tsv);

alter table public.knowledge_articles
  add column if not exists search_tsv tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(slug, '') || ' ' ||
      coalesce(title, '') || ' ' ||
      coalesce(body, '') || ' ' ||
      coalesce(category, '') || ' ' ||
      coalesce(array_to_string(tags, ' '), '')
    )
  ) stored;

create index if not exists knowledge_articles_search_tsv_idx on public.knowledge_articles using gin (search_tsv);
