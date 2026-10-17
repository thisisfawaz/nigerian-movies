-- Cached channel video history (full list from YouTube Data API).

create table if not exists public.channel_videos (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  video_id text not null,
  title text not null,
  thumbnail_url text,
  published_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (channel_id, video_id)
);

create index if not exists channel_videos_channel_idx
  on public.channel_videos (channel_id, position);

-- Public read only for videos of published channels.
alter table public.channel_videos enable row level security;

drop policy if exists "public read channel videos" on public.channel_videos;
create policy "public read channel videos"
  on public.channel_videos for select
  using (
    exists (
      select 1 from public.channels c
      where c.id = channel_videos.channel_id and c.status = 'published'
    )
  );

-- Service role keeps full access (bypasses RLS).
