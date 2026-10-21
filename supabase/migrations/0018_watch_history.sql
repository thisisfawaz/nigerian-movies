-- Per-user watch history. One row per (user, video), so rewatches move the
-- entry to the top instead of duplicating it. Display fields are denormalized
-- for the same reason as favourites: the page renders without joins and
-- survives channel renames.

create table if not exists public.watch_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text not null,
  title text not null,
  thumbnail_url text,
  channel_slug text not null,
  channel_name text not null,
  watched_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create index if not exists watch_history_user_watched_idx
  on public.watch_history (user_id, watched_at desc);

alter table public.watch_history enable row level security;

-- A user may read/insert/delete only their own history.
drop policy if exists "users read own history" on public.watch_history;
create policy "users read own history"
  on public.watch_history for select
  using (auth.uid() = user_id);

drop policy if exists "users insert own history" on public.watch_history;
create policy "users insert own history"
  on public.watch_history for insert
  with check (auth.uid() = user_id);

drop policy if exists "users update own history" on public.watch_history;
create policy "users update own history"
  on public.watch_history for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users delete own history" on public.watch_history;
create policy "users delete own history"
  on public.watch_history for delete
  using (auth.uid() = user_id);
