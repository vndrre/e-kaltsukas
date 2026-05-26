create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create index if not exists favorites_item_id_idx on public.favorites (item_id);
