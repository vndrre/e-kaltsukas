-- Run in Supabase SQL editor (or via migration). One draft row per authenticated user.

create table if not exists public.listing_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint listing_drafts_user_id_key unique (user_id)
);

create index if not exists listing_drafts_user_id_idx on public.listing_drafts (user_id);
create index if not exists listing_drafts_updated_at_idx on public.listing_drafts (updated_at desc);

alter table public.listing_drafts enable row level security;

-- Optional: allow users to manage their own row when using Supabase client with user JWT.
-- The Node API uses the service role when configured, which bypasses RLS.

create policy "listing_drafts_select_own"
  on public.listing_drafts
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "listing_drafts_insert_own"
  on public.listing_drafts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "listing_drafts_update_own"
  on public.listing_drafts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "listing_drafts_delete_own"
  on public.listing_drafts
  for delete
  to authenticated
  using (auth.uid() = user_id);
