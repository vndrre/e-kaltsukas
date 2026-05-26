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
  // Use most recent item for the conversation
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
    console.error("No items found. Seed items first.");
    process.exit(1);
  }

  const itemId = items[0].id;

  const now = new Date().toISOString();

  const { data: convo, error: convoError } = await supabase
    .from("conversations")
    .insert({
      item_id: itemId,
      buyer_id: SEED_BUYER_ID,
      seller_id: SEED_SELLER_ID,
      last_message_at: now
    })
    .select()
    .single();

  if (convoError) {
    console.error("Seed conversations failed:", convoError);
    process.exit(1);
  }

  const { data: messages, error: msgError } = await supabase
    .from("messages")
    .insert([
      {
        conversation_id: convo.id,
        sender_id: SEED_BUYER_ID,
        body: "Hi! Is this still available?"
      },
      {
        conversation_id: convo.id,
        sender_id: SEED_SELLER_ID,
        body: "Yes, it is! I can ship tomorrow."
      }
    ])
    .select();

  if (msgError) {
    console.error("Seed messages failed:", msgError);
    process.exit(1);
  }

  console.log("Seeded conversations: 1, messages:", messages.length);
  process.exit(0);
}

main();

