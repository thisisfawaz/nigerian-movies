-- Return many loosely related titles instead of only near-exact matches.
--
-- Real titles carry cast names and marketing suffixes, so even a correctly
-- spelled query scores low against the stored string. A threshold of 0.05
-- keeps those films in play while still ordering by similarity, so the best
-- match is first.

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
