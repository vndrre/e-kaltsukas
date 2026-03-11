const { supabase } = require("../services/supabaseClient");

const listItems = async (req, res) => {
  try {
    const { q, category, size, brand, minPrice, maxPrice } = req.query;

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

    if (category) {
      query = query.eq("category", category);
    }

    if (size) {
      query = query.eq("size", size);
    }

    if (brand) {
      query = query.eq("brand", brand);
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
        is_new: isNew ? 1 : 0,
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
      images: data.images_json ? JSON.parse(data.images_json) : []
    };

    return res.status(201).json({ item });
  } catch (err) {
    console.error("createItem error", err);
    return res.status(500).json({ message: "Failed to create item" });
  }
};

module.exports = {
  listItems,
  createItem
};
