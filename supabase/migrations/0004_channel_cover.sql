-- Channel banner/cover image (from YouTube brandingSettings).

alter table public.channels
  add column if not exists cover_url text;
