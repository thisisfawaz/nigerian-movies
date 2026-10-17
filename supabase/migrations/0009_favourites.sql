-- Per-user favourites (watch later). One row per (user, video).
-- Display fields are denormalized so the favourites page renders without joins
-- and survives channel renames/removals.

create table if not exists public.favourites (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text not null,
  title text not null,
  thumbnail_url text,
  channel_slug text not null,
  channel_name text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create index if not exists favourites_user_created_idx
  on public.favourites (user_id, created_at desc);

alter table public.favourites enable row level security;

-- A user may read/insert/delete only their own favourites.
drop policy if exists "users read own favourites" on public.favourites;
create policy "users read own favourites"
  on public.favourites for select
  using (auth.uid() = user_id);

drop policy if exists "users insert own favourites" on public.favourites;
create policy "users insert own favourites"
  on public.favourites for insert
  with check (auth.uid() = user_id);

drop policy if exists "users delete own favourites" on public.favourites;
create policy "users delete own favourites"
  on public.favourites for delete
  using (auth.uid() = user_id);
