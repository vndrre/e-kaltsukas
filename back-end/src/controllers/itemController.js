const { supabase } = require("../services/supabaseClient");
const { uploadBufferToCloudinary } = require("../utils/cloudinaryUpload");
const { env } = require("../config/env");

const DEFAULT_OPTIONS = {
  audiences: [
    { id: 1, code: "women", label: "Women" },
    { id: 2, code: "men", label: "Men" },
    { id: 3, code: "kids", label: "Kids" },
    { id: 4, code: "unisex", label: "Unisex" }
  ],
  categoriesByAudience: {
    women: [
      "tops", "t-shirts", "blouses", "sweaters", "hoodies", "jackets", "coats",
      "dresses", "jumpsuits", "jeans", "pants", "skirts", "shorts", "activewear",
      "lingerie", "sleepwear", "swimwear", "maternity", "shoes", "bags", "accessories"
    ],
    men: [
      "t-shirts", "shirts", "polos", "sweaters", "hoodies", "jackets", "coats",
      "jeans", "pants", "shorts", "suits", "activewear", "underwear", "sleepwear",
      "swimwear", "shoes", "bags", "accessories"
    ],
    kids: ["tops", "bottoms", "sets", "outerwear", "sleepwear", "swimwear", "shoes", "accessories"],
    unisex: ["t-shirts", "hoodies", "sweatshirts", "jackets", "pants", "activewear", "accessories"]
  },
  brands: [
    "Nike", "Adidas", "Zara", "H&M", "Uniqlo", "Levi's", "Gucci", "Prada", "Louis Vuitton", "Chanel",
    "Balenciaga", "Burberry", "Dior", "Versace", "Ralph Lauren", "Tommy Hilfiger", "Calvin Klein",
    "Armani", "The North Face", "Patagonia", "Columbia", "Puma", "Reebok", "New Balance", "ASOS",
    "Bershka", "Pull & Bear", "Mango", "Massimo Dutti", "Forever 21", "Urban Outfitters",
    "Brandy Melville", "Shein", "Gap", "Old Navy", "American Eagle", "Abercrombie & Fitch", "Hollister",
    "Lululemon", "Gymshark", "Under Armour", "Vans", "Converse", "Dr. Martens", "Timberland"
  ],
  sizesByGroup: {
    general: ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"],
    women_eu: ["32", "34", "36", "38", "40", "42", "44", "46", "48", "50", "52"],
    men_eu: ["44", "46", "48", "50", "52", "54", "56", "58", "60"],
    jeans: ["W26L30", "W28L32", "W30L32", "W32L34", "W34L34", "W36L36"],
    shoes_eu: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"],
    kids_eu: ["50", "56", "62", "68", "74", "80", "86", "92", "98", "104", "110", "116", "122", "128", "134", "140", "146", "152"]
  }
};

const buildFallbackOptions = () => {
  let categoryId = 1;
  const categories = Object.entries(DEFAULT_OPTIONS.categoriesByAudience).flatMap(([audienceCode, names]) =>
    names.map((name) => ({
      id: categoryId++,
      name,
      audienceCode
    }))
  );

  const brands = DEFAULT_OPTIONS.brands.map((name, index) => ({
    id: index + 1,
    name
  }));

  let sizeId = 1;
  const sizes = Object.entries(DEFAULT_OPTIONS.sizesByGroup).flatMap(([groupCode, values]) =>
    values.map((value, index) => ({
      id: sizeId++,
      value,
      groupCode,
      sortOrder: index + 1
    }))
  );

  return {
    audiences: DEFAULT_OPTIONS.audiences,
    categories,
    brands,
    sizes
  };
};

const listItems = async (req, res) => {
  try {
    const { q, category, size, brand, audience, minPrice, maxPrice, sellerId } = req.query;

    let query = supabase.from("items").select(
      `
        id,
        title,
        description,
        price_cents,
        condition,
        size,
        brand,
        audience,
        category,
        is_new,
        images_json,
        seller_id,
        created_at
      `
    );

    if (q) {
      query = query.or(
        `title.ilike.%${q}%,description.ilike.%${q}%`
      );
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (size) {
      query = query.eq("size", size);
    }

    if (brand) {
      query = query.eq("brand", brand);
    }

    if (audience) {
      query = query.eq("audience", audience);
    }

    if (sellerId) {
      query = query.eq("seller_id", sellerId);
    }

    if (minPrice) {
      query = query.gte("price_cents", Number(minPrice) * 100);
    }

    if (maxPrice) {
      query = query.lte("price_cents", Number(maxPrice) * 100);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("listItems supabase error", error);
      return res.status(500).json({ message: "Failed to list items" });
    }

    const items =
      data?.map((row) => ({
        ...row,
        price: row.price_cents / 100,
        images: row.images_json ? JSON.parse(row.images_json) : []
      })) || [];

    return res.json({ items });
  } catch (err) {
    console.error("listItems error", err);
    return res.status(500).json({ message: "Failed to list items" });
  }
};

const getItemOptions = async (req, res) => {
  try {
    const [
      { data: audiences, error: audiencesError },
      { data: categories, error: categoriesError },
      { data: brands, error: brandsError },
      { data: sizeGroups, error: sizeGroupsError },
      { data: sizes, error: sizesError }
    ] = await Promise.all([
      supabase.from("audiences").select("id, code, label").order("id", { ascending: true }),
      supabase.from("categories").select("id, audience_id, name").order("name", { ascending: true }),
      supabase.from("brands").select("id, name").order("name", { ascending: true }),
      supabase.from("size_groups").select("id, code").order("id", { ascending: true }),
      supabase.from("sizes").select("id, value, sort_order, size_group_id").order("sort_order", { ascending: true })
    ]);

    if (audiencesError || categoriesError || brandsError || sizeGroupsError || sizesError) {
      console.error("getItemOptions supabase error", {
        audiencesError,
        categoriesError,
        brandsError,
        sizeGroupsError,
        sizesError
      });
      return res.status(500).json({ message: "Failed to load item options" });
    }

    const audienceCodeById =
      audiences?.reduce((acc, entry) => {
        acc[entry.id] = entry.code;
        return acc;
      }, {}) ?? {};

    const sizeGroupCodeById =
      sizeGroups?.reduce((acc, entry) => {
        acc[entry.id] = entry.code;
        return acc;
      }, {}) ?? {};

    const normalizedAudiences =
      audiences?.map((entry) => ({
        id: entry.id,
        code: entry.code,
        label: entry.label
      })) ?? [];

    const normalizedCategories =
      categories?.map((entry) => ({
        id: entry.id,
        name: entry.name,
        audienceCode: audienceCodeById[entry.audience_id] ?? null
      })) ?? [];

    const normalizedBrands =
      brands?.map((entry) => ({
        id: entry.id,
        name: entry.name
      })) ?? [];

    const normalizedSizes =
      sizes?.map((entry) => ({
        id: entry.id,
        value: entry.value,
        groupCode: sizeGroupCodeById[entry.size_group_id] ?? null,
        sortOrder: entry.sort_order ?? 0
      })) ?? [];

    const hasNoSeededOptions =
      normalizedAudiences.length === 0 &&
      normalizedCategories.length === 0 &&
      normalizedBrands.length === 0 &&
      normalizedSizes.length === 0;

    const options = hasNoSeededOptions
      ? buildFallbackOptions()
      : {
          audiences: normalizedAudiences,
          categories: normalizedCategories,
          brands: normalizedBrands,
          sizes: normalizedSizes
        };

    return res.json({
      options
    });
  } catch (err) {
    console.error("getItemOptions error", err);
    return res.status(500).json({ message: "Failed to load item options" });
  }
};

const getItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("items")
      .select(
        `
        id,
        title,
        description,
        price_cents,
        condition,
        size,
        brand,
        audience,
        category,
        is_new,
        images_json,
        seller_id,
        created_at
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("getItemById supabase error", error);
      return res.status(500).json({ message: "Failed to load item" });
    }

    if (!data) {
      return res.status(404).json({ message: "Item not found" });
    }

    const item = {
      ...data,
      price: data.price_cents / 100,
      images: data.images_json ? JSON.parse(data.images_json) : []
    };

    return res.json({ item });
  } catch (err) {
    console.error("getItemById error", err);
    return res.status(500).json({ message: "Failed to load item" });
  }
};

const createItem = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const {
      title,
      description,
      price,
      condition,
      size,
      brand,
      audience,
      category,
      isNew,
      images
    } = req.body;
    if (images != null && !Array.isArray(images)) {
      return res.status(400).json({ message: "images must be an array of URLs" });
    }


    if (!title || price == null) {
      return res
        .status(400)
        .json({ message: "Title and price are required" });
    }

    const numericPrice = Number(price);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res
        .status(400)
        .json({ message: "Price must be a valid non-negative number" });
    }

    const priceCents = Math.round(numericPrice * 100);

    const { data, error } = await supabase
      .from("items")
      .insert({
        title,
        description: description || null,
        price_cents: priceCents,
        condition: condition || null,
        size: size || null,
        brand: brand || null,
        audience: audience || null,
        category: category || null,
        is_new: Boolean(isNew),
        images_json: images && images.length ? JSON.stringify(images) : null,
        seller_id: userId
      })
      .select(
        `
        id,
        title,
        description,
        price_cents,
        condition,
        size,
        brand,
        audience,
        category,
        is_new,
        images_json,
        seller_id,
        created_at
      `
      )
      .single();

    if (error) {
      console.error("createItem supabase error", error);
      return res.status(500).json({ message: "Failed to create item" });
    }

    const item = {
      ...data,
      price: data.price_cents / 100,
      images: data.images_json ? JSON.parse(data.images_json) : []
    };

    return res.status(201).json({ item });
  } catch (err) {
    console.error("createItem error", err);
    return res.status(500).json({ message: "Failed to create item" });
  }
};

const uploadItemImage = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    if (!env.CLOUDINARY_URL) {
      return res
        .status(500)
        .json({ message: "CLOUDINARY_URL is missing in server config" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "image file is required" });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({ message: "Only image uploads are allowed" });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, {
      public_id: `user-${req.user.id}-${Date.now()}`
    });

    return res.status(201).json({
      image: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format
      }
    });
  } catch (err) {
    console.error("uploadItemImage error", err);
    return res.status(500).json({ message: "Failed to upload image" });
  }
};

module.exports = {
  listItems,
  getItemOptions,
  getItemById,
  createItem,
  uploadItemImage
};
