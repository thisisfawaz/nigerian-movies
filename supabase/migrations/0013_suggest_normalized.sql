-- Improve "did you mean" suggestions.
--
-- The previous version compared the raw query against raw titles, so a space
-- in the query ("wild fird") scored far lower than the same letters joined
-- ("wildfird") and fell below the threshold. Comparing normalised forms makes
-- both score identically, and the threshold is lowered to catch near misses.

create or replace function public.suggest_video_title(
  search_term text,
  min_similarity real default 0.2
)
returns text
language sql
stable
security invoker
set search_path = public
as $$
  with normalized_term as (
    select lower(regexp_replace(search_term, '[^a-z0-9]+', '', 'gi')) as term
  ),
  best as (
    select
      v.title,
      similarity(
        lower(regexp_replace(v.title, '[^a-z0-9]+', '', 'gi')),
        nt.term
      ) as score
    from public.channel_videos v
    join public.channels c on c.id = v.channel_id
    cross join normalized_term nt
    where c.status = 'published'
      and nt.term <> ''
    order by score desc
    limit 1
  )
  select title from best where score >= min_similarity;
$$;
