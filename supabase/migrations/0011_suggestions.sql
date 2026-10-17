-- Channel suggestions submitted by signed-in visitors, reviewed by admins.

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  youtube_channel_url text not null,
  note text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text,
  created_channel_id uuid references public.channels(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists suggestions_status_idx
  on public.suggestions (status, created_at desc);
create index if not exists suggestions_user_idx
  on public.suggestions (user_id, created_at desc);

alter table public.suggestions enable row level security;

-- A visitor may submit a suggestion and read their own.
drop policy if exists "users insert own suggestions" on public.suggestions;
create policy "users insert own suggestions"
  on public.suggestions for insert
  with check (auth.uid() = user_id);

drop policy if exists "users read own suggestions" on public.suggestions;
create policy "users read own suggestions"
  on public.suggestions for select
  using (auth.uid() = user_id);

-- Admin review happens server-side with the service role, which bypasses RLS.
-- No public update/delete policies: visitors cannot modify suggestions.
