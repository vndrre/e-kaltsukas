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
  const profiles = [
    {
      id: SEED_SELLER_ID,
      username: "seller_demo",
      bio: "Demo seller account",
      location: "London",
      instagram: "@seller_demo"
    },
    {
      id: SEED_BUYER_ID,
      username: "buyer_demo",
      bio: "Demo buyer account",
      location: "Manchester"
    }
  ];

  let count = 0;

  for (const profile of profiles) {
    const { data, error } = await supabase
      .from("profiles")
      .upsert(profile, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("Seed profiles failed for", profile.username, ":", error);
      process.exit(1);
    }

    count += 1;
  }

  console.log("Seeded profiles:", count);
  process.exit(0);
}

main();

