-- Word-level search matching.
--
-- Whole-string trigram similarity failed on this catalogue: titles carry cast
-- names and marketing suffixes, so a short film name is a small fraction of
-- the stored string and scores near zero. "godfathr" did not find "THE
-- GODFATHER - ..." at all.
--
-- Instead, split the query into words and count how many of them appear
-- approximately somewhere in the title. A query word matches a title word when
-- their similarity is above a low bar, which tolerates typos such as
-- brother/brothel and thn/ten. The score is the fraction of query words that
-- matched, so titles containing more of what was typed rank higher.

drop function if exists public.search_videos_fuzzy(text, integer, real);

create or replace function public.search_videos_fuzzy(
  search_term text,
  result_limit integer default 48,
  min_similarity real default 0.2
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
  with q as (
    -- Query words, punctuation removed, short noise words dropped.
    select array_agg(w) as words
    from (
      select lower(w) as w
      from regexp_split_to_table(search_term, '[^a-zA-Z0-9]+') as w
      where length(w) > 1
    ) s
  ),
  scored as (
    select
      v.video_id,
      v.title,
      v.thumbnail_url,
      v.published_at,
      v.is_short,
      v.channel_id,
      c.name as channel_name,
      c.slug as channel_slug,
      (
        -- Fraction of query words that approximately match a title word.
        select count(distinct qw)::real / greatest(array_length(q.words, 1), 1)
        from unnest(q.words) as qw
        where exists (
          select 1
          from regexp_split_to_table(lower(v.title), '[^a-zA-Z0-9]+') as tw
          where length(tw) > 1
            and similarity(tw, qw) >= 0.45
        )
      ) as score
    from public.channel_videos v
    join public.channels c on c.id = v.channel_id
    cross join q
    where c.status = 'published'
      and array_length(q.words, 1) is not null
  )
  select
    video_id, title, thumbnail_url, published_at, is_short,
    channel_id, channel_name, channel_slug, score
  from scored
  where score >= min_similarity
  order by score desc, published_at desc nulls last
  limit result_limit;
$$;
