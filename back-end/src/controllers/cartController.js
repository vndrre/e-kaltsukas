const { supabase, supabaseAdmin } = require("../services/supabaseClient");
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const db = supabaseAdmin ?? supabase;
const OFFER_PREFIX = "__OFFER__";

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

const parseAcceptedOfferCents = (body) => {
  if (typeof body !== "string" || !body.startsWith(OFFER_PREFIX)) {
    return null;
  }

  try {
    const payload = JSON.parse(body.slice(OFFER_PREFIX.length));
    if (payload?.kind !== "offer" || payload?.status !== "accepted") {
      return null;
    }
    const amount = Number(payload.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      return null;
    }
    return Math.round(amount * 100);
  } catch {
    return null;
  }
};

const mapCartRow = (row, acceptedOfferPriceByItemId = new Map()) => {
  const item = row?.item;
  if (!item) {
    return null;
  }

  const acceptedOfferPriceCents = acceptedOfferPriceByItemId.get(item.id);
  const unitPriceCents = row.offer_price_cents ?? acceptedOfferPriceCents ?? item.price_cents ?? 0;

  return {
    id: row.id,
    itemId: item.id,
    unitPriceCents,
    unitPrice: unitPriceCents / 100,
    lineTotalCents: unitPriceCents,
    lineTotal: unitPriceCents / 100,
    item: {
      id: item.id,
      title: item.title,
      sellerId: item.seller_id,
      brand: item.brand,
      category: item.category,
      condition: item.condition,
      size: item.size,
      images: normalizeImages(item.images_json)
    }
  };
};

const listCartItems = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { data, error } = await db
      .from("cart_items")
      .select(
        `
          id,
          offer_price_cents,
          created_at,
          item:items (
            id,
            title,
            price_cents,
            images_json,
            seller_id,
            brand,
            category,
            condition,
            size
          )
        `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("listCartItems supabase error", error);
      return res.status(500).json({ message: "Failed to load cart" });
    }

    const rows = data ?? [];
    const itemIds = rows.map((entry) => entry?.item?.id).filter(Boolean);
    const acceptedOfferPriceByItemId = new Map();

    if (itemIds.length > 0) {
      const { data: conversations, error: conversationsError } = await db
        .from("conversations")
        .select("id, item_id")
        .eq("buyer_id", userId)
        .in("item_id", itemIds);

      if (conversationsError) {
        console.error("listCartItems conversations lookup error", conversationsError);
      } else {
        const conversationById = new Map((conversations ?? []).map((entry) => [entry.id, entry.item_id]));
        const conversationIds = [...conversationById.keys()];

        if (conversationIds.length > 0) {
          const { data: messages, error: messagesError } = await db
            .from("messages")
            .select("conversation_id, body, created_at")
            .in("conversation_id", conversationIds)
            .like("body", `${OFFER_PREFIX}%`)
            .order("created_at", { ascending: true });

          if (messagesError) {
            console.error("listCartItems offer messages lookup error", messagesError);
          } else {
            (messages ?? []).forEach((message) => {
              const itemId = conversationById.get(message.conversation_id);
              if (!itemId) {
                return;
              }
              const acceptedCents = parseAcceptedOfferCents(message.body);
              if (acceptedCents != null) {
                // Messages are ordered by created_at asc; last accepted for item wins.
                acceptedOfferPriceByItemId.set(itemId, acceptedCents);
              }
            });
          }
        }
      }
    }

    const items = rows.map((row) => mapCartRow(row, acceptedOfferPriceByItemId)).filter(Boolean);
    const itemCount = items.length;
    const subtotalCents = items.reduce((sum, entry) => sum + entry.lineTotalCents, 0);

    return res.json({
      items,
      summary: {
        itemCount,
        subtotalCents,
        subtotal: subtotalCents / 100
      }
    });
  } catch (err) {
    console.error("listCartItems error", err);
    return res.status(500).json({ message: "Failed to load cart" });
  }
};

const getCartCount = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { data, error } = await db
      .from("cart_items")
      .select("id")
      .eq("user_id", userId);

    if (error) {
      console.error("getCartCount supabase error", error);
      return res.status(500).json({ message: "Failed to load cart count" });
    }

    const count = data?.length ?? 0;
    return res.json({ count });
  } catch (err) {
    console.error("getCartCount error", err);
    return res.status(500).json({ message: "Failed to load cart count" });
  }
};

const addToCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    const rawItemId = req.body?.itemId ?? req.body?.item_id;
    const itemId = typeof rawItemId === "string" ? rawItemId.trim() : "";

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    if (!itemId) {
      return res.status(400).json({ message: "itemId is required" });
    }
    if (!UUID_REGEX.test(itemId)) {
      return res.status(400).json({ message: "itemId must be a valid UUID listing id" });
    }

    const { data: item, error: itemError } = await db
      .from("items")
      .select("id, seller_id")
      .eq("id", itemId)
      .maybeSingle();

    if (itemError) {
      console.error("addToCart item lookup error", itemError);
      return res.status(500).json({ message: itemError.message || "Failed to validate item" });
    }

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (item.seller_id === userId) {
      return res.status(400).json({ message: "You cannot add your own listing to cart" });
    }

    const { data: existing, error: existingError } = await db
      .from("cart_items")
      .select("id, offer_price_cents")
      .eq("user_id", userId)
      .eq("item_id", itemId)
      .maybeSingle();

    if (existingError) {
      console.error("addToCart existing lookup error", existingError);
      return res.status(500).json({ message: existingError.message || "Failed to update cart" });
    }

    if (existing) {
      return res.status(200).json({ ok: true, alreadyInCart: true });
    } else {
      const { error: insertError } = await db
        .from("cart_items")
        .insert({
          user_id: userId,
          item_id: itemId,
          offer_price_cents: null
        });

      if (insertError) {
        console.error("addToCart insert error", insertError);
        if (insertError.code === "42P01") {
          return res.status(500).json({ message: "cart_items table is missing. Run cart schema SQL migration." });
        }
        if (insertError.code === "42501") {
          return res.status(500).json({ message: "Permission denied on cart_items. Set SUPABASE_SERVICE_ROLE_KEY on backend." });
        }
        return res.status(500).json({ message: insertError.message || "Failed to add item to cart" });
      }
    }

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("addToCart error", err);
    return res.status(500).json({ message: "Failed to add item to cart" });
  }
};

const updateCartItemQuantity = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { itemId } = req.params;
    const { quantity } = req.body ?? {};

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const nextQuantity = Number(quantity);
    if (!Number.isInteger(nextQuantity) || (nextQuantity !== 0 && nextQuantity !== 1)) {
      return res.status(400).json({ message: "quantity must be 0 (remove) or 1" });
    }

    if (nextQuantity === 0) {
      const { error: deleteError } = await db
        .from("cart_items")
        .delete()
        .eq("user_id", userId)
        .eq("item_id", itemId);

      if (deleteError) {
        console.error("updateCartItemQuantity delete error", deleteError);
        return res.status(500).json({ message: "Failed to update cart" });
      }

      return res.json({ ok: true, removed: true });
    }

    return res.json({ ok: true, unchanged: true });
  } catch (err) {
    console.error("updateCartItemQuantity error", err);
    return res.status(500).json({ message: "Failed to update cart" });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { itemId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { error } = await db
      .from("cart_items")
      .delete()
      .eq("user_id", userId)
      .eq("item_id", itemId);

    if (error) {
      console.error("removeFromCart supabase error", error);
      return res.status(500).json({ message: "Failed to remove item from cart" });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("removeFromCart error", err);
    return res.status(500).json({ message: "Failed to remove item from cart" });
  }
};

module.exports = {
  listCartItems,
  getCartCount,
  addToCart,
  updateCartItemQuantity,
  removeFromCart
};
