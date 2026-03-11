const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SEED_SELLER_ID = process.env.SEED_SELLER_ID;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

if (!SEED_SELLER_ID) {
  console.error("Missing SEED_SELLER_ID in .env (must be an existing auth.users.id)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const items = [
    {
      title: "Vintage denim jacket",
      description: "Light wash, size M, great condition.",
      price_cents: 4500,
      condition: "used",
      size: "M",
      brand: "Levi's",
      category: "Jackets",
      is_new: false,
      images_json: ["https://example.com/denim1.jpg"],
      seller_id: SEED_SELLER_ID
    },
    {
      title: "Nike Air Force 1",
      description: "White, size 9 UK, worn a few times.",
      price_cents: 6500,
      condition: "used",
      size: "9",
      brand: "Nike",
      category: "Shoes",
      is_new: false,
      images_json: ["https://example.com/af1.jpg"],
      seller_id: SEED_SELLER_ID
    },
    {
      title: "Brand new graphic tee",
      description: "Unworn, size L, black with minimal print.",
      price_cents: 2500,
      condition: "new",
      size: "L",
      brand: "H&M",
      category: "Tops",
      is_new: true,
      images_json: ["https://example.com/tee.jpg"],
      seller_id: SEED_SELLER_ID
    }
  ];

  const { data, error } = await supabase
    .from("items")
    .insert(
      items.map((item) => ({
        ...item,
        images_json: JSON.stringify(item.images_json)
      }))
    )
    .select();

  if (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }

  console.log("Seeded items:", data?.length || 0);
  process.exit(0);
}

main();

