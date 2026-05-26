const { getBlockingOrderItemIds } = require("./orderAvailability");

const normalizeShippingAddress = (value) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const name = typeof value.name === "string" ? value.name.trim() : "";
  const line1 = typeof value.line1 === "string" ? value.line1.trim() : "";
  const city = typeof value.city === "string" ? value.city.trim() : "";
  const country = typeof value.country === "string" ? value.country.trim() : "";
  const postalCode =
    typeof value.postalCode === "string"
      ? value.postalCode.trim()
      : typeof value.postal_code === "string"
        ? value.postal_code.trim()
        : "";

  if (!name || !line1 || !city || !country) {
    return null;
  }

  return {
    name,
    line1,
    city,
    country,
    postalCode: postalCode || undefined
  };
};

const loadCartCheckoutRows = async (db, userId) => {
  const { data: cartRows, error: cartError } = await db
    .from("cart_items")
    .select(
      `
        id,
        offer_price_cents,
        item:items (
          id,
          seller_id,
          price_cents,
          title
        )
      `
    )
    .eq("user_id", userId);

  if (cartError) {
    const error = new Error("Failed to load cart");
    error.cause = cartError;
    throw error;
  }

  const rows = (cartRows ?? []).filter((entry) => entry?.item?.id);
  if (!rows.length) {
    const error = new Error("Your cart is empty");
    error.code = "EMPTY_CART";
    throw error;
  }

  const itemIds = rows.map((entry) => entry.item.id);
  let blockedItemIds;
  try {
    blockedItemIds = await getBlockingOrderItemIds(db, itemIds);
  } catch (activeOrdersError) {
    const error = new Error("Failed to validate listings");
    error.cause = activeOrdersError;
    throw error;
  }

  const orderPayloads = [];
  let totalCents = 0;

  for (const entry of rows) {
    const item = entry.item;
    if (!item?.seller_id) {
      const error = new Error("One or more cart items are missing seller details");
      error.code = "INVALID_CART";
      throw error;
    }

    if (item.seller_id === userId) {
      const error = new Error("You cannot buy your own listing");
      error.code = "OWN_LISTING";
      throw error;
    }

    if (blockedItemIds.has(item.id)) {
      const error = new Error("One or more items already have an active order");
      error.code = "ITEM_UNAVAILABLE";
      throw error;
    }

    const priceCents = entry.offer_price_cents ?? item.price_cents ?? 0;
    if (!Number.isInteger(priceCents) || priceCents <= 0) {
      const error = new Error("One or more items have an invalid price");
      error.code = "INVALID_PRICE";
      throw error;
    }

    totalCents += priceCents;
    orderPayloads.push({
      item_id: item.id,
      buyer_id: userId,
      seller_id: item.seller_id,
      price_cents: priceCents,
      item_title: item.title ?? "Listing"
    });
  }

  return {
    rows,
    orderPayloads,
    totalCents,
    itemIds
  };
};

const fulfillDemoCheckoutFromCart = async (db, userId, shippingAddress) => {
  const { orderPayloads } = await loadCartCheckoutRows(db, userId);
  const paidAt = new Date().toISOString();
  const insertPayloads = orderPayloads.map((entry) => ({
    item_id: entry.item_id,
    buyer_id: entry.buyer_id,
    seller_id: entry.seller_id,
    price_cents: entry.price_cents,
    status: "paid",
    payout_status: "held",
    paid_at: paidAt,
    shipping_address: shippingAddress
  }));

  const { data: createdOrders, error: insertError } = await db.from("orders").insert(insertPayloads).select("id");

  if (insertError) {
    throw insertError;
  }

  const { error: clearCartError } = await db.from("cart_items").delete().eq("user_id", userId);
  if (clearCartError) {
    console.error("fulfillDemoCheckoutFromCart clear cart error", clearCartError);
  }

  return (createdOrders ?? []).map((entry) => entry.id);
};

module.exports = {
  fulfillDemoCheckoutFromCart,
  loadCartCheckoutRows,
  normalizeShippingAddress
};
