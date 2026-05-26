-- Reference for the existing public.orders table in Supabase.
-- Do not run this file to create orders from scratch; it documents the live schema
-- and optional follow-ups for demo checkout / wallet fields already present.

-- Observed order_status enum values:
-- pending, paid, shipped, completed, cancelled, refunded

-- Demo checkout flow in the API:
-- 1. POST /api/orders/checkout -> status = paid, payout_status = held, paid_at set
-- 2. POST /api/orders/:id/mark-shipped -> status = shipped
-- 3. POST /api/orders/:id/confirm-receipt -> status = completed, payout_status = released, completed_at set

-- Optional: keep updated_at in sync if you add a trigger later.
create or replace function public.set_orders_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row
execute function public.set_orders_updated_at();
