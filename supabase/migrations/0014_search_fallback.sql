-- Similarity-ranked search, used only when the exact search returns nothing.
--
-- Compares normalised forms so spacing and punctuation do not matter, and
-- orders by trigram similarity so a one-letter typo still surfaces the film.
-- The threshold is deliberately low: a wrong suggestion costs little, and the
-- intended film is usually somewhere in the list.

-- The returned shape is dropped first because the column list changes.
drop function if exists public.search_videos_fuzzy(text, integer, real);

create or replace function public.search_videos_fuzzy(
  search_term text,
  result_limit integer default 48,
  min_similarity real default 0.15
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
  )
  select
    v.video_id,
    v.title,
    v.thumbnail_url,
    v.published_at,
    v.is_short,
    v.channel_id,
    c.name as channel_name,
    c.slug as channel_slug,
    similarity(
      lower(regexp_replace(v.title, '[^a-z0-9]+', '', 'gi')),
      nt.term
    ) as score
  from public.channel_videos v
  join public.channels c on c.id = v.channel_id
  cross join normalized_term nt
  where c.status = 'published'
    and nt.term <> ''
    and similarity(
      lower(regexp_replace(v.title, '[^a-z0-9]+', '', 'gi')),
      nt.term
    ) >= min_similarity
  order by score desc, v.published_at desc nulls last
  limit result_limit;
$$;
