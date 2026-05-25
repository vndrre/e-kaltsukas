const { supabase, supabaseAdmin } = require("../services/supabaseClient");
const { creditOrderRelease, handleWalletError } = require("../services/walletService");
const {
  fulfillDemoCheckoutFromCart,
  normalizeShippingAddress
} = require("../services/checkoutService");

const db = supabaseAdmin ?? supabase;
const SHIPPING_CARRIER = "DPD";
const DPD_TRACKING_NUMBER_PATTERN = /^\d{14}$/;

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

const mapOrderRow = (row) => {
  const item = row?.item;
  const buyer = row?.buyer;
  const seller = row?.seller;

  return {
    id: row.id,
    itemId: row.item_id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    priceCents: row.price_cents,
    price: row.price_cents / 100,
    status: row.status,
    payoutStatus: row.payout_status ?? null,
    shippingAddress: row.shipping_address ?? null,
    carrier: row.carrier ?? null,
    trackingNumber: row.tracking_number ?? null,
    paidAt: row.paid_at ?? null,
    shippedAt: row.shipped_at ?? null,
    completedAt: row.completed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    item: item
      ? {
          id: item.id,
          title: item.title,
          brand: item.brand,
          category: item.category,
          images: normalizeImages(item.images_json)
        }
      : null,
    buyer: buyer
      ? {
          id: buyer.id,
          username: buyer.username,
          avatarUrl: buyer.avatar_url
        }
      : null,
    seller: seller
      ? {
          id: seller.id,
          username: seller.username,
          avatarUrl: seller.avatar_url
        }
      : null
  };
};

const orderSelect = `
  id,
  item_id,
  buyer_id,
  seller_id,
  price_cents,
  status,
  payout_status,
  shipping_address,
  carrier,
  tracking_number,
  paid_at,
  shipped_at,
  completed_at,
  created_at,
  updated_at,
  item:items (
    id,
    title,
    brand,
    category,
    images_json
  )
`;

const attachProfiles = async (rows) => {
  const userIds = [
    ...new Set(
      (rows ?? [])
        .flatMap((row) => [row.buyer_id, row.seller_id])
        .filter(Boolean)
    )
  ];

  if (!userIds.length) {
    return rows ?? [];
  }

  const { data: profiles, error } = await db
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", userIds);

  if (error) {
    console.error("attachProfiles error", error);
    return rows ?? [];
  }

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return (rows ?? []).map((row) => ({
    ...row,
    buyer: profilesById.get(row.buyer_id)
      ? {
          id: row.buyer_id,
          username: profilesById.get(row.buyer_id).username,
          avatar_url: profilesById.get(row.buyer_id).avatar_url
        }
      : null,
    seller: profilesById.get(row.seller_id)
      ? {
          id: row.seller_id,
          username: profilesById.get(row.seller_id).username,
          avatar_url: profilesById.get(row.seller_id).avatar_url
        }
      : null
  }));
};

const checkoutFromCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    const shippingAddress = normalizeShippingAddress(
      req.body?.shippingAddress ?? req.body?.shipping_address ?? null
    );

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    if (!shippingAddress) {
      return res.status(400).json({ message: "Enter your delivery address to continue" });
    }

    const orderIds = await fulfillDemoCheckoutFromCart(db, userId, shippingAddress);
    if (!orderIds.length) {
      return res.status(500).json({ message: "Failed to place order" });
    }

    const { data, error } = await db.from("orders").select(orderSelect).in("id", orderIds);
    if (error) {
      console.error("checkoutFromCart order lookup error", error);
      return res.status(500).json({ message: "Failed to load orders" });
    }

    const orders = (await attachProfiles(data ?? [])).map(mapOrderRow);
    return res.status(201).json({
      orders,
      summary: {
        orderCount: orders.length,
        totalCents: orders.reduce((sum, entry) => sum + entry.priceCents, 0)
      }
    });
  } catch (err) {
    console.error("checkoutFromCart error", err);

    if (err.code === "EMPTY_CART") {
      return res.status(400).json({ message: err.message });
    }

    if (err.code === "OWN_LISTING") {
      return res.status(400).json({ message: err.message });
    }

    if (err.code === "ITEM_UNAVAILABLE") {
      return res.status(409).json({ message: err.message });
    }

    if (err.code === "INVALID_CART" || err.code === "INVALID_PRICE") {
      return res.status(400).json({ message: err.message });
    }

    if (err.code === "42P01") {
      return res.status(500).json({ message: "orders table is missing. Run orders schema SQL migration." });
    }

    return res.status(500).json({ message: err.message || "Failed to place order" });
  }
};

const listOrders = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = typeof req.query?.role === "string" ? req.query.role.trim().toLowerCase() : "all";

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    let query = db.from("orders").select(orderSelect).order("created_at", { ascending: false });

    if (role === "buying") {
      query = query.eq("buyer_id", userId);
    } else if (role === "selling") {
      query = query.eq("seller_id", userId);
    } else {
      query = query.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("listOrders error", error);
      if (error.code === "42P01") {
        return res.status(500).json({ message: "orders table is missing. Run orders schema SQL migration." });
      }
      return res.status(500).json({ message: "Failed to load orders" });
    }

    return res.json({
      orders: (await attachProfiles(data ?? [])).map(mapOrderRow)
    });
  } catch (err) {
    console.error("listOrders error", err);
    return res.status(500).json({ message: "Failed to load orders" });
  }
};

const getOrderById = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { orderId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { data, error } = await db
      .from("orders")
      .select(orderSelect)
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      console.error("getOrderById error", error);
      return res.status(500).json({ message: "Failed to load order" });
    }

    if (!data) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (data.buyer_id !== userId && data.seller_id !== userId) {
      return res.status(403).json({ message: "You do not have access to this order" });
    }

    return res.json({ order: mapOrderRow((await attachProfiles([data]))[0]) });
  } catch (err) {
    console.error("getOrderById error", err);
    return res.status(500).json({ message: "Failed to load order" });
  }
};

const markOrderShipped = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { orderId } = req.params;
    const carrier = typeof req.body?.carrier === "string" ? req.body.carrier.trim() : "";
    const trackingNumber =
      typeof req.body?.trackingNumber === "string"
        ? req.body.trackingNumber.trim()
        : typeof req.body?.tracking_number === "string"
          ? req.body.tracking_number.trim()
          : "";

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    if (!trackingNumber) {
      return res.status(400).json({ message: "trackingNumber is required" });
    }

    if (carrier && carrier !== SHIPPING_CARRIER) {
      return res.status(400).json({ message: "Only DPD shipping is supported" });
    }

    if (!DPD_TRACKING_NUMBER_PATTERN.test(trackingNumber)) {
      return res.status(400).json({ message: "trackingNumber must be a 14-digit numeric code" });
    }

    const normalizedCarrier = SHIPPING_CARRIER;

    const { data: existing, error: existingError } = await db
      .from("orders")
      .select("id, seller_id, status")
      .eq("id", orderId)
      .maybeSingle();

    if (existingError) {
      console.error("markOrderShipped lookup error", existingError);
      return res.status(500).json({ message: "Failed to load order" });
    }

    if (!existing) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (existing.seller_id !== userId) {
      return res.status(403).json({ message: "Only the seller can mark this order as shipped" });
    }

    if (existing.status !== "paid") {
      return res.status(400).json({ message: "Only paid orders awaiting shipment can be marked shipped" });
    }

    const shippedAt = new Date().toISOString();
    const { data, error } = await db
      .from("orders")
      .update({
        status: "shipped",
        carrier: normalizedCarrier,
        tracking_number: trackingNumber,
        shipped_at: shippedAt
      })
      .eq("id", orderId)
      .select(orderSelect)
      .single();

    if (error) {
      console.error("markOrderShipped update error", error);
      return res.status(500).json({ message: error.message || "Failed to mark order shipped" });
    }

    return res.json({ order: mapOrderRow((await attachProfiles([data]))[0]) });
  } catch (err) {
    console.error("markOrderShipped error", err);
    return res.status(500).json({ message: "Failed to mark order shipped" });
  }
};

const confirmOrderReceipt = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { orderId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { data: existing, error: existingError } = await db
      .from("orders")
      .select("id, buyer_id, seller_id, status, price_cents, payout_status")
      .eq("id", orderId)
      .maybeSingle();

    if (existingError) {
      console.error("confirmOrderReceipt lookup error", existingError);
      return res.status(500).json({ message: "Failed to load order" });
    }

    if (!existing) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (existing.buyer_id !== userId) {
      return res.status(403).json({ message: "Only the buyer can confirm receipt" });
    }

    if (existing.status !== "shipped") {
      return res.status(400).json({ message: "Only shipped orders can be confirmed" });
    }

    if (existing.payout_status !== "released") {
      try {
        await creditOrderRelease({
          sellerId: existing.seller_id,
          orderId: existing.id,
          amountCents: existing.price_cents
        });
      } catch (walletError) {
        console.error("confirmOrderReceipt wallet release error", walletError);
        return handleWalletError(walletError, res, "Failed to release seller earnings");
      }
    }

    const completedAt = new Date().toISOString();
    const { data, error } = await db
      .from("orders")
      .update({
        status: "completed",
        payout_status: "released",
        completed_at: completedAt
      })
      .eq("id", orderId)
      .select(orderSelect)
      .single();

    if (error) {
      console.error("confirmOrderReceipt update error", error);
      return res.status(500).json({ message: error.message || "Failed to confirm receipt" });
    }

    return res.json({ order: mapOrderRow((await attachProfiles([data]))[0]) });
  } catch (err) {
    console.error("confirmOrderReceipt error", err);
    return res.status(500).json({ message: "Failed to confirm receipt" });
  }
};

module.exports = {
  checkoutFromCart,
  listOrders,
  getOrderById,
  markOrderShipped,
  confirmOrderReceipt
};
