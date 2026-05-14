const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const SELLER_IDS = [
  "1aa01c5a-e8f8-4505-b8b5-e094cb1c0e1e",
  "eca354d5-1a60-45db-a51d-2b582ce46cfe"
];

const ITEM_CONDITIONS = [
  "New with tags",
  "Like new",
  "Very good",
  "Good",
  "Fair"
];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY in .env"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const picsum = (seed, width = 640, height = 853) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}.jpg`;

const catalog = [
  {
    title: "Vintage denim jacket",
    description: "Light wash, relaxed fit, size M. Soft broken-in denim with minimal fading.",
    price_cents: 4500,
    condition: "Very good",
    size: "M",
    brand: "Levi's",
    category: "jackets",
    imageSeed: "ekaltsukas-denim-jacket"
  },
  {
    title: "Nike Air Force 1",
    description: "White low-tops, UK 9. Worn a handful of times and freshly cleaned.",
    price_cents: 6500,
    condition: "Like new",
    size: "9",
    brand: "Nike",
    category: "shoes",
    imageSeed: "ekaltsukas-air-force-1"
  },
  {
    title: "Black graphic tee",
    description: "Unworn oversized tee, size L. Minimal front print on heavyweight cotton.",
    price_cents: 2500,
    condition: "New with tags",
    size: "L",
    brand: "H&M",
    category: "tops",
    imageSeed: "ekaltsukas-graphic-tee"
  },
  {
    title: "Wool trench coat",
    description: "Camel double-breasted trench, size S. Lined and ideal for spring layering.",
    price_cents: 12000,
    condition: "Good",
    size: "S",
    brand: "Massimo Dutti",
    category: "coats",
    imageSeed: "ekaltsukas-trench-coat"
  },
  {
    title: "Linen midi dress",
    description: "Sage green midi dress, size M. Lightweight linen with a square neckline.",
    price_cents: 3800,
    condition: "Very good",
    size: "M",
    brand: "Zara",
    category: "dresses",
    imageSeed: "ekaltsukas-linen-dress"
  },
  {
    title: "Adidas Samba OG",
    description: "Black and gum sole, EU 41. Classic trainers with light sole wear only.",
    price_cents: 7200,
    condition: "Like new",
    size: "41",
    brand: "Adidas",
    category: "shoes",
    imageSeed: "ekaltsukas-samba-og"
  },
  {
    title: "Cashmere crewneck",
    description: "Oatmeal knit sweater, size M. Soft cashmere blend with no pilling.",
    price_cents: 5400,
    condition: "Very good",
    size: "M",
    brand: "Ralph Lauren",
    category: "sweaters",
    imageSeed: "ekaltsukas-cashmere-crew"
  },
  {
    title: "Straight-leg jeans",
    description: "Mid-blue straight jeans, size 32. High rise with a clean hem.",
    price_cents: 3200,
    condition: "Good",
    size: "32",
    brand: "Gap",
    category: "jeans",
    imageSeed: "ekaltsukas-straight-jeans"
  },
  {
    title: "Quilted puffer vest",
    description: "Navy padded vest, size L. Lightweight insulation with zip pockets.",
    price_cents: 4100,
    condition: "Very good",
    size: "L",
    brand: "Uniqlo",
    category: "jackets",
    imageSeed: "ekaltsukas-puffer-vest"
  },
  {
    title: "Silk slip skirt",
    description: "Champagne bias-cut skirt, size S. Satin finish with an elastic waist.",
    price_cents: 2900,
    condition: "Good",
    size: "S",
    brand: "Zara",
    category: "skirts",
    imageSeed: "ekaltsukas-slip-skirt"
  },
  {
    title: "Leather crossbody bag",
    description: "Tan crossbody with adjustable strap. Compact interior with magnetic closure.",
    price_cents: 8800,
    condition: "Like new",
    size: "One size",
    brand: "Mango",
    category: "bags",
    imageSeed: "ekaltsukas-crossbody-bag"
  },
  {
    title: "Striped Oxford shirt",
    description: "Blue stripe button-down, size M. Crisp cotton with a relaxed office fit.",
    price_cents: 2700,
    condition: "New with tags",
    size: "M",
    brand: "Tommy Hilfiger",
    category: "shirts",
    imageSeed: "ekaltsukas-oxford-shirt"
  },
  {
    title: "Merino roll neck",
    description: "Charcoal roll neck, size S. Fine merino layer for colder days.",
    price_cents: 3600,
    condition: "Very good",
    size: "S",
    brand: "Uniqlo",
    category: "sweaters",
    imageSeed: "ekaltsukas-roll-neck"
  },
  {
    title: "Suede ankle boots",
    description: "Taupe ankle boots, EU 39. Block heel with a side zip and light sole wear.",
    price_cents: 9500,
    condition: "Good",
    size: "39",
    brand: "Dr. Martens",
    category: "shoes",
    imageSeed: "ekaltsukas-ankle-boots"
  },
  {
    title: "Pleated midi skirt",
    description: "Black pleated skirt, size M. Flowy silhouette with a high waist.",
    price_cents: 3100,
    condition: "Fair",
    size: "M",
    brand: "Bershka",
    category: "skirts",
    imageSeed: "ekaltsukas-pleated-skirt"
  },
  {
    title: "Canvas tote bag",
    description: "Natural canvas shopper with inner pocket. Roomy everyday carry.",
    price_cents: 1800,
    condition: "New with tags",
    size: "One size",
    brand: "Patagonia",
    category: "bags",
    imageSeed: "ekaltsukas-canvas-tote"
  }
];

function buildSeedItems() {
  return catalog.map((entry, index) => {
    const { imageSeed, ...item } = entry;

    return {
      ...item,
      is_new: item.condition === "New with tags",
      seller_id: SELLER_IDS[index % SELLER_IDS.length],
      images_json: JSON.stringify([
        picsum(imageSeed),
        picsum(`${imageSeed}-detail`, 640, 853)
      ])
    };
  });
}

async function main() {
  const items = buildSeedItems();
  const invalidCondition = items.find(
    (item) => !ITEM_CONDITIONS.includes(item.condition)
  );

  if (invalidCondition) {
    console.error(`Invalid condition in seed data: ${invalidCondition.condition}`);
    process.exit(1);
  }

  const { data, error } = await supabase.from("items").insert(items).select("id, title, seller_id");

  if (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }

  const sellerCounts = SELLER_IDS.reduce((counts, sellerId) => {
    counts[sellerId] = 0;
    return counts;
  }, {});

  for (const row of data ?? []) {
    sellerCounts[row.seller_id] = (sellerCounts[row.seller_id] ?? 0) + 1;
  }

  console.log(`Seeded ${data?.length ?? 0} items.`);
  for (const sellerId of SELLER_IDS) {
    console.log(`  ${sellerId}: ${sellerCounts[sellerId] ?? 0}`);
  }

  process.exit(0);
}

main();
