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
  add column if not exists search_tsv tsvector;

create or replace function public.knowledge_articles_set_search_tsv()
returns trigger
language plpgsql
as $$
begin
  new.search_tsv := to_tsvector(
    'english',
    coalesce(new.slug, '') || ' ' ||
    coalesce(new.title, '') || ' ' ||
    coalesce(new.body, '') || ' ' ||
    coalesce(new.category, '') || ' ' ||
    coalesce(array_to_string(new.tags, ' '), '')
  );
  return new;
end;
$$;

update public.knowledge_articles
set search_tsv = to_tsvector(
  'english',
  coalesce(slug, '') || ' ' ||
  coalesce(title, '') || ' ' ||
  coalesce(body, '') || ' ' ||
  coalesce(category, '') || ' ' ||
  coalesce(array_to_string(tags, ' '), '')
);

drop trigger if exists knowledge_articles_search_tsv_trigger on public.knowledge_articles;
create trigger knowledge_articles_search_tsv_trigger
before insert or update of slug, title, body, category, tags on public.knowledge_articles
for each row execute procedure public.knowledge_articles_set_search_tsv();

create index if not exists knowledge_articles_search_tsv_idx on public.knowledge_articles using gin (search_tsv);
