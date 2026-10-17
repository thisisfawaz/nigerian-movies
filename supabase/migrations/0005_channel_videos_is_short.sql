-- Distinguish YouTube Shorts (Teasers) from full movies.
-- A short is a video of 3 minutes or less.

alter table public.channel_videos
  add column if not exists is_short boolean not null default false;

create index if not exists channel_videos_short_idx
  on public.channel_videos (channel_id, is_short, published_at desc);
