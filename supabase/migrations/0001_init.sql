-- PodcastFM initial schema (PRD §8)
-- Run this only when using Supabase. Static mode does not need it.

create extension if not exists "pgcrypto";

-- 8.1 channels ---------------------------------------------------------------
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  youtube_channel_url text not null,
  youtube_channel_id text,
  youtube_playlist_id text,
  youtube_embed_url text,
  thumbnail_url text,
  language_code text,
  country_code text,
  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'published', 'archived')),
  is_featured boolean not null default false,
  source text not null default 'manual' check (source = 'manual'),
  metadata_source text,
  ai_classification_status text not null default 'not_started'
    check (ai_classification_status in ('not_started', 'pending', 'completed', 'failed', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

-- Reliable uniqueness for a known YouTube channel identifier (PRD §8.1).
create unique index if not exists channels_youtube_channel_id_key
  on public.channels (youtube_channel_id)
  where youtube_channel_id is not null;

-- 8.2 categories -------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8.3 channel_categories -----------------------------------------------------
create table if not exists public.channel_categories (
  channel_id uuid not null references public.channels(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  is_primary boolean not null default false,
  assigned_by text not null default 'admin' check (assigned_by in ('admin', 'ai')),
  created_at timestamptz not null default now(),
  primary key (channel_id, category_id)
);

-- A published channel should have at most one primary category.
create unique index if not exists channel_categories_one_primary
  on public.channel_categories (channel_id)
  where is_primary = true;

-- 8.4 channel_tags -----------------------------------------------------------
create table if not exists public.channel_tags (
  channel_id uuid not null references public.channels(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  primary key (channel_id, tag)
);

-- 8.6 ai_classification_runs -------------------------------------------------
create table if not exists public.ai_classification_runs (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  provider text,
  model text,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed')),
  input_summary text,
  output_json jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- 8.7 admin_audit_logs -------------------------------------------------------
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- updated_at trigger --------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists channels_set_updated_at on public.channels;
create trigger channels_set_updated_at
  before update on public.channels
  for each row execute function public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- Row Level Security (PRD §12.2) -------------------------------------------
-- Public can read only published channels and active categories.
-- All mutations require the service role (admin server routes).

alter table public.channels enable row level security;
alter table public.categories enable row level security;
alter table public.channel_categories enable row level security;
alter table public.channel_tags enable row level security;

drop policy if exists "public read published channels" on public.channels;
create policy "public read published channels"
  on public.channels for select
  using (status = 'published');

drop policy if exists "public read active categories" on public.categories;
create policy "public read active categories"
  on public.categories for select
  using (is_active = true);

drop policy if exists "public read channel_categories" on public.channel_categories;
create policy "public read channel_categories"
  on public.channel_categories for select
  using (
    exists (
      select 1 from public.channels c
      where c.id = channel_categories.channel_id and c.status = 'published'
    )
  );

drop policy if exists "public read channel_tags" on public.channel_tags;
create policy "public read channel_tags"
  on public.channel_tags for select
  using (
    exists (
      select 1 from public.channels c
      where c.id = channel_tags.channel_id and c.status = 'published'
    )
  );

-- Seed a starter category taxonomy (PRD §5.1 C).
insert into public.categories (name, slug, sort_order) values
  ('Business', 'business', 10),
  ('Entrepreneurship', 'entrepreneurship', 20),
  ('Technology', 'technology', 30),
  ('Science', 'science', 40),
  ('Education', 'education', 50),
  ('News and Politics', 'news-and-politics', 60),
  ('Entertainment', 'entertainment', 70),
  ('Comedy', 'comedy', 80),
  ('Relationships', 'relationships', 90),
  ('Health and Wellness', 'health-and-wellness', 100),
  ('Sports', 'sports', 110),
  ('Society and Culture', 'society-and-culture', 120),
  ('Personal Development', 'personal-development', 130),
  ('History', 'history', 140),
  ('Religion and Spirituality', 'religion-and-spirituality', 150),
  ('Arts and Creativity', 'arts-and-creativity', 160),
  ('Finance', 'finance', 170),
  ('Lifestyle', 'lifestyle', 180)
on conflict (slug) do nothing;
