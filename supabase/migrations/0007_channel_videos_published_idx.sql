-- Support the homepage "Recently added" feed: full movies of published channels
-- ordered by YouTube publication date, newest first.

create index if not exists channel_videos_published_idx
  on public.channel_videos (is_short, published_at desc);
