create table if not exists public.cart_items (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  item_id uuid not null,
  offer_price_cents integer null,
  quantity integer not null default 1,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint cart_items_pkey primary key (id),
  constraint cart_items_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint cart_items_item_id_fkey foreign key (item_id) references public.items (id) on delete cascade,
  constraint cart_items_user_item_unique unique (user_id, item_id),
  constraint cart_items_quantity_check check (quantity = 1),
  constraint cart_items_offer_price_cents_check check (offer_price_cents is null or offer_price_cents >= 0)
) tablespace pg_default;

create index if not exists cart_items_user_id_idx on public.cart_items using btree (user_id) tablespace pg_default;
create index if not exists cart_items_item_id_idx on public.cart_items using btree (item_id) tablespace pg_default;
create index if not exists cart_items_created_at_idx on public.cart_items using btree (created_at desc) tablespace pg_default;

create or replace function public.set_cart_items_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cart_items_updated_at on public.cart_items;
create trigger trg_cart_items_updated_at
before update on public.cart_items
for each row
execute function public.set_cart_items_updated_at();

-- If the table already exists with a different quantity check, run:
-- alter table public.cart_items drop constraint if exists cart_items_quantity_check;
-- alter table public.cart_items add constraint cart_items_quantity_check check (quantity = 1);
-- update public.cart_items set quantity = 1 where quantity <> 1;
-- alter table public.cart_items add column if not exists offer_price_cents integer null;
-- alter table public.cart_items drop constraint if exists cart_items_offer_price_cents_check;
-- alter table public.cart_items add constraint cart_items_offer_price_cents_check check (offer_price_cents is null or offer_price_cents >= 0);
