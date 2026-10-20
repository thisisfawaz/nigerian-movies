-- Search support: word-joining matches and "did you mean" suggestions.
--
-- 1. `title_normalized` strips everything but letters and digits, so titles can
--    be matched regardless of spacing, hyphens, or punctuation. "Spider-Man"
--    and "spiderman" normalise to the same string.
-- 2. pg_trgm powers similarity(), used to offer a suggestion when a search
--    returns no exact matches.

create extension if not exists pg_trgm;

-- Generated column: always in sync with title, no trigger required.
alter table public.channel_videos
  add column if not exists title_normalized text
  generated always as (
    lower(regexp_replace(title, '[^a-z0-9]+', '', 'gi'))
  ) stored;

-- Substring matching on the normalised column.
create index if not exists channel_videos_title_normalized_idx
  on public.channel_videos (title_normalized text_pattern_ops);

-- Trigram index for similarity() lookups when nothing matches exactly.
create index if not exists channel_videos_title_trgm_idx
  on public.channel_videos using gin (title gin_trgm_ops);

--
-- Suggest the closest known title when a search finds nothing.
-- Returns null when the best candidate is below the similarity threshold, so
-- callers never show a suggestion that is obviously unrelated.
--
create or replace function public.suggest_video_title(
  search_term text,
  min_similarity real default 0.3
)
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select candidate.title
  from (
    select v.title, similarity(v.title, search_term) as score
    from public.channel_videos v
    join public.channels c on c.id = v.channel_id
    where c.status = 'published'
    order by score desc
    limit 1
  ) as candidate
  where candidate.score >= min_similarity;
$$;
