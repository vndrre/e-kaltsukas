const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

dotenv.config();

const { SUPABASE_URL, SUPABASE_ANON_KEY, SEED_BUYER_ID } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

if (!SEED_BUYER_ID) {
  console.error("Missing SEED_BUYER_ID in .env (use auth.users ID)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  // Pick the most recent item as a favorite
  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1);

  if (itemsError) {
    console.error("Fetch items failed:", itemsError);
    process.exit(1);
  }

  if (!items || items.length === 0) {
    console.error("No items found to favorite. Seed items first.");
    process.exit(1);
  }

  const itemId = items[0].id;

  const { data, error } = await supabase
    .from("favorites")
    .upsert(
      {
        user_id: SEED_BUYER_ID,
        item_id: itemId
      },
      { onConflict: "user_id,item_id" }
    )
    .select();

  if (error) {
    console.error("Seed favorites failed:", error);
    process.exit(1);
  }

  console.log("Seeded favorites:", data.length);
  process.exit(0);
}

main();

