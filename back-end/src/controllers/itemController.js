const { supabase } = require("../services/supabaseClient");
const { uploadBufferToCloudinary } = require("../utils/cloudinaryUpload");
const { env } = require("../config/env");

const listItems = async (req, res) => {
  try {
    const { q, category, size, brand, minPrice, maxPrice, sellerId } = req.query;

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
  getItemById,
  createItem,
  uploadItemImage
};
