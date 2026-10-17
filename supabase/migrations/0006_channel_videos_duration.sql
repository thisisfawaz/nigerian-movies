-- Store the video's duration so the platform can enforce the rule that a
-- full movie must be at least 20 minutes long. Anything shorter is a teaser or
-- clip and is excluded from Latest Movies.

alter table public.channel_videos
  add column if not exists duration_seconds integer;

-- Helps the discovery feed select only sufficiently long videos per channel.
create index if not exists channel_videos_duration_idx
  on public.channel_videos (channel_id, is_short, duration_seconds);
