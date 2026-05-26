const PURCHASE_BLOCKING_ORDER_STATUSES = ["pending", "paid", "shipped", "completed"];

const getBlockingOrderItemIds = async (db, itemIds) => {
  const ids = [...new Set((itemIds ?? []).filter(Boolean))];
  if (!ids.length) {
    return new Set();
  }

  const { data, error } = await db
    .from("orders")
    .select("item_id")
    .in("item_id", ids)
    .in("status", PURCHASE_BLOCKING_ORDER_STATUSES);

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((entry) => entry.item_id));
};

const itemHasBlockingOrder = async (db, itemId) => {
  if (!itemId) {
    return false;
  }

  const blockedIds = await getBlockingOrderItemIds(db, [itemId]);
  return blockedIds.has(itemId);
};

const CONVERSATION_LOCKED_MESSAGE =
  "This conversation is locked because payment has been made for this item.";

const getConversationLockState = async (db, itemId) => {
  if (!itemId) {
    return { isLocked: false, lockReason: null };
  }

  const isLocked = await itemHasBlockingOrder(db, itemId);
  return {
    isLocked,
    lockReason: isLocked ? CONVERSATION_LOCKED_MESSAGE : null
  };
};

module.exports = {
  CONVERSATION_LOCKED_MESSAGE,
  PURCHASE_BLOCKING_ORDER_STATUSES,
  getBlockingOrderItemIds,
  getConversationLockState,
  itemHasBlockingOrder
};
