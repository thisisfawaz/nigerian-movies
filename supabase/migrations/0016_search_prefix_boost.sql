-- Rank results by similarity plus a prefix bonus.
--
-- Long real titles (cast names, years, marketing suffixes) score low against
-- short unrelated titles purely by trigram similarity. A query that matches
-- the START of a title is far more likely to be the intended film, so that is
-- weighted heavily: the score becomes similarity + 0.4 * prefix_ratio, where
-- prefix_ratio compares only the first characters.

drop function if exists public.search_videos_fuzzy(text, integer, real);

create or replace function public.search_videos_fuzzy(
  search_term text,
  result_limit integer default 48,
  min_similarity real default 0.05
)
returns table (
  video_id text,
  title text,
  thumbnail_url text,
  published_at timestamptz,
  is_short boolean,
  channel_id uuid,
  channel_name text,
  channel_slug text,
  score real
)
language sql
stable
security invoker
set search_path = public
as $$
  with normalized_term as (
    select lower(regexp_replace(search_term, '[^a-z0-9]+', '', 'gi')) as term
  ),
  candidates as (
    select
      v.video_id,
      v.title,
      v.thumbnail_url,
      v.published_at,
      v.is_short,
      v.channel_id,
      c.name as channel_name,
      c.slug as channel_slug,
      lower(regexp_replace(v.title, '[^a-z0-9]+', '', 'gi')) as norm_title,
      nt.term
    from public.channel_videos v
    join public.channels c on c.id = v.channel_id
    cross join normalized_term nt
    where c.status = 'published' and nt.term <> ''
  )
  select
    video_id,
    title,
    thumbnail_url,
    published_at,
    is_short,
    channel_id,
    channel_name,
    channel_slug,
    (
      similarity(norm_title, term)
      + 0.4 * similarity(left(norm_title, length(term)), term)
    )::real as score
  from candidates
  where similarity(norm_title, term) >= min_similarity
  order by score desc, published_at desc nulls last
  limit result_limit;
$$;
