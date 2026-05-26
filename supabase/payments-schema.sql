create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  payment_intent_id text not null unique,
  shipping_address jsonb not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists checkout_sessions_user_id_idx on public.checkout_sessions (user_id);

alter table public.orders
  add column if not exists stripe_payment_intent_id text;

create index if not exists orders_stripe_payment_intent_id_idx on public.orders (stripe_payment_intent_id);
