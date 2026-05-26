const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

dotenv.config();

const { SUPABASE_URL, SUPABASE_ANON_KEY, SEED_SELLER_ID, SEED_BUYER_ID } =
  process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

if (!SEED_SELLER_ID || !SEED_BUYER_ID) {
  console.error(
    "Missing SEED_SELLER_ID or SEED_BUYER_ID in .env (use auth.users IDs)"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  // Use most recent item
  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("id, price_cents")
    .order("created_at", { ascending: false })
    .limit(1);

  if (itemsError) {
    console.error("Fetch items failed:", itemsError);
    process.exit(1);
  }

  if (!items || items.length === 0) {
    console.error("No items found. Seed items first.");
    process.exit(1);
  }

  const item = items[0];

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      item_id: item.id,
      buyer_id: SEED_BUYER_ID,
      seller_id: SEED_SELLER_ID,
      price_cents: item.price_cents,
      status: "completed",
      shipping_address: {
        name: "Buyer Demo",
        line1: "123 Demo Street",
        city: "Manchester",
        country: "UK"
      }
    })
    .select()
    .single();

  if (orderError) {
    console.error("Seed orders failed:", orderError);
    process.exit(1);
  }

  const { data: review, error: reviewError } = await supabase
    .from("reviews")
    .insert({
      order_id: order.id,
      reviewer_id: SEED_BUYER_ID,
      reviewee_id: SEED_SELLER_ID,
      rating: 5,
      comment: "Great seller, fast shipping!"
    })
    .select()
    .single();

  if (reviewError) {
    console.error("Seed reviews failed:", reviewError);
    process.exit(1);
  }

  console.log("Seeded orders: 1, reviews: 1");
  process.exit(0);
}

main();

