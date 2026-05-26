const { supabase, supabaseAdmin } = require("../services/supabaseClient");
const { uploadBufferToCloudinary } = require("../utils/cloudinaryUpload");
const { env } = require("../config/env");
const { itemHasBlockingOrder, getBlockingOrderItemIds } = require("../services/orderAvailability");

const db = supabaseAdmin ?? supabase;

const normalizeImages = (imagesJson) => {
  if (!imagesJson) {
    return [];
  }

  if (Array.isArray(imagesJson)) {
    return imagesJson;
  }

  if (typeof imagesJson === "string") {
    try {
      const parsed = JSON.parse(imagesJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

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

const collectQueryValues = (value) => {
  if (value == null) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  return [
    ...new Set(
      values
        .flatMap((entry) => String(entry).split(","))
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  ];
};

const applyInFilter = (query, column, values) => {
  if (!values.length) {
    return query;
  }

  if (values.length === 1) {
    return query.eq(column, values[0]);
  }

  return query.in(column, values);
};

const listItems = async (req, res) => {
  try {
    const { q, brand, minPrice, maxPrice, sellerId } = req.query;
    const categories = collectQueryValues(req.query.category ?? req.query.categories);
    const sizes = collectQueryValues(req.query.size ?? req.query.sizes);

    let query = supabase.from("items").select(
      `
        id,
        title,
        description,
        price_cents,
        condition,
        size,
        brand,
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

    if (categories.length) {
      query = applyInFilter(query, "category", categories);
    }

    if (sizes.length) {
      query = applyInFilter(query, "size", sizes);
    }

    if (brand) {
      query = query.eq("brand", brand);
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

    const rows = data ?? [];
    let blockedItemIds = new Set();

    try {
      blockedItemIds = await getBlockingOrderItemIds(
        db,
        rows.map((row) => row.id)
      );
    } catch (blockingOrderError) {
      console.error("listItems availability lookup error", blockingOrderError);
      return res.status(500).json({ message: "Failed to filter unavailable listings" });
    }

    const items = rows
      .filter((row) => !blockedItemIds.has(row.id))
      .map((row) => ({
        ...row,
        price: row.price_cents / 100,
        images: normalizeImages(row.images_json)
      }));

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

    let isAvailableForPurchase = true;
    try {
      isAvailableForPurchase = !(await itemHasBlockingOrder(db, data.id));
    } catch (availabilityError) {
      console.error("getItemById availability lookup error", availabilityError);
    }

    const item = {
      ...data,
      price: data.price_cents / 100,
      images: normalizeImages(data.images_json),
      isAvailableForPurchase
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
      images: normalizeImages(data.images_json)
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

const listFavoriteItemIds = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { data, error } = await db
      .from("favorites")
      .select("item_id")
      .eq("user_id", userId);

    if (error) {
      console.error("listFavoriteItemIds supabase error", error);
      return res.status(500).json({ message: "Failed to load favorites" });
    }

    const favoriteItemIds = data?.map((entry) => entry.item_id) ?? [];
    return res.json({ favoriteItemIds });
  } catch (err) {
    console.error("listFavoriteItemIds error", err);
    return res.status(500).json({ message: "Failed to load favorites" });
  }
};

const listFavoriteItems = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { data: favorites, error: favoritesError } = await db
      .from("favorites")
      .select("item_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (favoritesError) {
      console.error("listFavoriteItems favorites error", favoritesError);
      return res.status(500).json({ message: "Failed to load favorites" });
    }

    const itemIds = (favorites ?? []).map((entry) => entry.item_id).filter(Boolean);
    if (!itemIds.length) {
      return res.json({ items: [] });
    }

    const { data: rows, error: itemsError } = await db
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
        category,
        is_new,
        images_json,
        seller_id,
        created_at
      `
      )
      .in("id", itemIds);

    if (itemsError) {
      console.error("listFavoriteItems items error", itemsError);
      return res.status(500).json({ message: "Failed to load favorites" });
    }

    const itemsById = new Map((rows ?? []).map((row) => [row.id, row]));
    const items = itemIds
      .map((itemId) => itemsById.get(itemId))
      .filter(Boolean)
      .map((row) => ({
        ...row,
        price: row.price_cents / 100,
        images: normalizeImages(row.images_json)
      }));

    return res.json({ items });
  } catch (err) {
    console.error("listFavoriteItems error", err);
    return res.status(500).json({ message: "Failed to load favorites" });
  }
};

const isItemFavorited = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id: itemId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { data, error } = await db
      .from("favorites")
      .select("item_id")
      .eq("user_id", userId)
      .eq("item_id", itemId)
      .maybeSingle();

    if (error) {
      console.error("isItemFavorited supabase error", error);
      return res.status(500).json({ message: "Failed to load favorite status" });
    }

    return res.json({ isFavorited: Boolean(data) });
  } catch (err) {
    console.error("isItemFavorited error", err);
    return res.status(500).json({ message: "Failed to load favorite status" });
  }
};

const addFavoriteItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id: itemId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { data: item, error: itemError } = await db
      .from("items")
      .select("id")
      .eq("id", itemId)
      .maybeSingle();

    if (itemError) {
      console.error("addFavoriteItem item lookup error", itemError);
      return res.status(500).json({ message: "Failed to add favorite" });
    }

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const { error } = await db
      .from("favorites")
      .upsert(
        {
          user_id: userId,
          item_id: itemId
        },
        {
          onConflict: "user_id,item_id",
          ignoreDuplicates: true
        }
      );

    if (error) {
      console.error("addFavoriteItem supabase error", error);
      return res.status(500).json({ message: "Failed to add favorite" });
    }

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("addFavoriteItem error", err);
    return res.status(500).json({ message: "Failed to add favorite" });
  }
};

const getListingDraft = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { data, error } = await db
      .from("listing_drafts")
      .select("payload, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("getListingDraft supabase error", error);
      return res.status(500).json({ message: "Failed to load draft" });
    }

    if (!data) {
      return res.json({ draft: null });
    }

    return res.json({
      draft: {
        payload: data.payload ?? {},
        updatedAt: data.updated_at
      }
    });
  } catch (err) {
    console.error("getListingDraft error", err);
    return res.status(500).json({ message: "Failed to load draft" });
  }
};

const upsertListingDraft = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { payload } = req.body;
    if (payload == null || typeof payload !== "object" || Array.isArray(payload)) {
      return res.status(400).json({ message: "payload must be a JSON object" });
    }

    const row = {
      user_id: userId,
      payload,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await db
      .from("listing_drafts")
      .upsert(row, { onConflict: "user_id" })
      .select("payload, updated_at")
      .single();

    if (error) {
      console.error("upsertListingDraft supabase error", error);
      return res.status(500).json({ message: "Failed to save draft" });
    }

    return res.json({
      draft: {
        payload: data.payload ?? {},
        updatedAt: data.updated_at
      }
    });
  } catch (err) {
    console.error("upsertListingDraft error", err);
    return res.status(500).json({ message: "Failed to save draft" });
  }
};

const deleteListingDraft = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { error } = await db.from("listing_drafts").delete().eq("user_id", userId);

    if (error) {
      console.error("deleteListingDraft supabase error", error);
      return res.status(500).json({ message: "Failed to delete draft" });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("deleteListingDraft error", err);
    return res.status(500).json({ message: "Failed to delete draft" });
  }
};

const removeFavoriteItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id: itemId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { error } = await db
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("item_id", itemId);

    if (error) {
      console.error("removeFavoriteItem supabase error", error);
      return res.status(500).json({ message: "Failed to remove favorite" });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("removeFavoriteItem error", err);
    return res.status(500).json({ message: "Failed to remove favorite" });
  }
};

const ITEM_CONDITIONS = [
  "New with tags",
  "Like new",
  "Very good",
  "Good",
  "Fair"
];

const mapItemRow = (row) => ({
  ...row,
  price: row.price_cents / 100,
  images: normalizeImages(row.images_json)
});

const purgeItemReferences = async (itemId) => {
  const { data: conversations, error: conversationsError } = await db
    .from("conversations")
    .select("id")
    .eq("item_id", itemId);

  if (conversationsError) {
    throw conversationsError;
  }

  const conversationIds = (conversations ?? []).map((entry) => entry.id);
  if (conversationIds.length) {
    const { error: messagesError } = await db
      .from("messages")
      .delete()
      .in("conversation_id", conversationIds);

    if (messagesError) {
      throw messagesError;
    }

    const { error: deleteConversationsError } = await db
      .from("conversations")
      .delete()
      .eq("item_id", itemId);

    if (deleteConversationsError) {
      throw deleteConversationsError;
    }
  }

  const cleanupResults = await Promise.all([
    db.from("favorites").delete().eq("item_id", itemId),
    db.from("cart_items").delete().eq("item_id", itemId)
  ]);

  for (const result of cleanupResults) {
    if (result.error) {
      throw result.error;
    }
  }
};

const loadOwnedItem = async (itemId, userId) => {
  const { data, error } = await db
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
      category,
      is_new,
      images_json,
      seller_id,
      created_at
    `
    )
    .eq("id", itemId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return { status: 404, message: "Item not found", item: null };
  }

  if (data.seller_id !== userId) {
    return { status: 403, message: "Forbidden", item: null };
  }

  return { status: 200, message: null, item: data };
};

const updateItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id: itemId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const owned = await loadOwnedItem(itemId, userId);
    if (!owned.item) {
      return res.status(owned.status).json({ message: owned.message });
    }

    if (await itemHasBlockingOrder(db, itemId)) {
      return res.status(409).json({
        message: "This listing can't be changed while an order is in progress."
      });
    }

    const {
      title,
      description,
      price,
      condition,
      size,
      brand,
      category,
      isNew,
      images
    } = req.body;

    if (images != null && !Array.isArray(images)) {
      return res.status(400).json({ message: "images must be an array of URLs" });
    }

    if (!title || price == null) {
      return res.status(400).json({ message: "Title and price are required" });
    }

    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ message: "Price must be a valid non-negative number" });
    }

    if (condition && !ITEM_CONDITIONS.includes(condition)) {
      return res.status(400).json({ message: "Invalid item condition" });
    }

    const priceCents = Math.round(numericPrice * 100);
    const nextImages = Array.isArray(images)
      ? images.filter((entry) => typeof entry === "string" && entry.trim())
      : normalizeImages(owned.item.images_json);

    const { data, error } = await db
      .from("items")
      .update({
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        price_cents: priceCents,
        condition: condition || null,
        size: size || null,
        brand: brand || null,
        category: category || null,
        is_new: typeof isNew === "boolean" ? isNew : condition === "New with tags",
        images_json: nextImages.length ? JSON.stringify(nextImages) : null
      })
      .eq("id", itemId)
      .select(
        `
        id,
        title,
        description,
        price_cents,
        condition,
        size,
        brand,
        category,
        is_new,
        images_json,
        seller_id,
        created_at
      `
      )
      .single();

    if (error) {
      console.error("updateItem supabase error", error);
      return res.status(500).json({ message: "Failed to update item" });
    }

    return res.json({ item: mapItemRow(data) });
  } catch (err) {
    console.error("updateItem error", err);
    return res.status(500).json({ message: "Failed to update item" });
  }
};

const deleteItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id: itemId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const owned = await loadOwnedItem(itemId, userId);
    if (!owned.item) {
      return res.status(owned.status).json({ message: owned.message });
    }

    if (await itemHasBlockingOrder(db, itemId)) {
      return res.status(409).json({
        message: "This listing can't be deleted while an order is in progress."
      });
    }

    try {
      await purgeItemReferences(itemId);
    } catch (cleanupError) {
      console.error("deleteItem cleanup error", cleanupError);
      return res.status(500).json({ message: "Failed to delete related listing data" });
    }

    const { error } = await db.from("items").delete().eq("id", itemId);

    if (error) {
      console.error("deleteItem supabase error", error);
      if (error.code === "23503") {
        return res.status(409).json({
          message: "This listing still has order history and can't be deleted."
        });
      }
      return res.status(500).json({ message: error.message || "Failed to delete item" });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("deleteItem error", err);
    return res.status(500).json({ message: "Failed to delete item" });
  }
};

module.exports = {
  listItems,
  getItemOptions,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  uploadItemImage,
  getListingDraft,
  upsertListingDraft,
  deleteListingDraft,
  listFavoriteItemIds,
  listFavoriteItems,
  isItemFavorited,
  addFavoriteItem,
  removeFavoriteItem
};
