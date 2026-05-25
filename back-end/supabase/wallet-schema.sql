-- Reference schema for demo wallet balances and ledger entries.

create table if not exists public.wallet_balances (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  available_cents integer not null default 0 check (available_cents >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('order_release', 'withdrawal')),
  amount_cents integer not null check (amount_cents > 0),
  direction text not null check (direction in ('credit', 'debit')),
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  order_id uuid null references public.orders (id) on delete set null,
  description text,
  created_at timestamptz not null default now()
);

create unique index if not exists wallet_transactions_order_release_unique
  on public.wallet_transactions (order_id)
  where type = 'order_release' and order_id is not null;

create index if not exists wallet_transactions_user_created_idx
  on public.wallet_transactions (user_id, created_at desc);
