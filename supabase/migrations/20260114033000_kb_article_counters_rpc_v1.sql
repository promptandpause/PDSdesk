create or replace function public.increment_knowledge_article_view(article_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s text;
begin
  if article_id is null then
    return;
  end if;

  select a.status into s
  from public.knowledge_articles a
  where a.id = increment_knowledge_article_view.article_id;

  if s is null then
    return;
  end if;

  if not (
    s = 'published'
    or public.is_global_admin()
    or public.can_work_tickets()
    or public.is_in_operator_group('customer_service')
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.knowledge_articles
  set view_count = view_count + 1
  where id = increment_knowledge_article_view.article_id;
end;
$$;

revoke all on function public.increment_knowledge_article_view(uuid) from public;
grant execute on function public.increment_knowledge_article_view(uuid) to authenticated;

create or replace function public.toggle_knowledge_article_like(article_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  already_liked boolean;
  s text;
begin
  if article_id is null then
    return false;
  end if;

  if auth.uid() is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select a.status into s
  from public.knowledge_articles a
  where a.id = toggle_knowledge_article_like.article_id;

  if s is null then
    return false;
  end if;

  if not (
    s = 'published'
    or public.is_global_admin()
    or public.can_work_tickets()
    or public.is_in_operator_group('customer_service')
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select exists(
    select 1
    from public.knowledge_article_likes l
    where l.article_id = toggle_knowledge_article_like.article_id
      and l.user_id = auth.uid()
  ) into already_liked;

  if already_liked then
    delete from public.knowledge_article_likes
    where article_id = toggle_knowledge_article_like.article_id
      and user_id = auth.uid();

    update public.knowledge_articles
    set like_count = greatest(like_count - 1, 0)
    where id = toggle_knowledge_article_like.article_id;

    return false;
  end if;

  insert into public.knowledge_article_likes (article_id, user_id)
  values (toggle_knowledge_article_like.article_id, auth.uid())
  on conflict do nothing;

  update public.knowledge_articles
  set like_count = like_count + 1
  where id = toggle_knowledge_article_like.article_id;

  return true;
end;
$$;

revoke all on function public.toggle_knowledge_article_like(uuid) from public;
grant execute on function public.toggle_knowledge_article_like(uuid) to authenticated;
