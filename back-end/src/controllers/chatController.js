const { supabase, supabaseAdmin } = require("../services/supabaseClient");

const createOrGetConversation = async (req, res) => {
  try {
    const db = supabaseAdmin || supabase;
    const buyerId = req.user?.id;
    const { itemId, sellerId } = req.body || {};

    if (!buyerId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    if (!itemId || !sellerId) {
      return res.status(400).json({ message: "itemId and sellerId are required" });
    }

    if (buyerId === sellerId) {
      return res.status(400).json({ message: "You cannot chat with yourself" });
    }

    const { data: item, error: itemError } = await db
      .from("items")
      .select("id, seller_id")
      .eq("id", itemId)
      .maybeSingle();

    if (itemError) {
      console.error("createOrGetConversation item lookup error", itemError);
      return res.status(500).json({ message: itemError.message || "Failed to validate item" });
    }

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (item.seller_id !== sellerId) {
      return res.status(400).json({ message: "Seller does not match item owner" });
    }

    const { data: existingConversation, error: existingError } = await db
      .from("conversations")
      .select("id, item_id, buyer_id, seller_id, last_message_at, created_at")
      .eq("item_id", itemId)
      .eq("buyer_id", buyerId)
      .eq("seller_id", sellerId)
      .maybeSingle();

    if (existingError) {
      console.error("createOrGetConversation select error", existingError);
      return res.status(500).json({ message: existingError.message || "Failed to load conversation" });
    }

    if (existingConversation) {
      return res.json({ conversation: existingConversation });
    }

    const { data: createdConversation, error: createError } = await db
      .from("conversations")
      .insert({
        item_id: itemId,
        buyer_id: buyerId,
        seller_id: sellerId
      })
      .select("id, item_id, buyer_id, seller_id, last_message_at, created_at")
      .single();

    if (createError) {
      console.error("createOrGetConversation insert error", createError);
      return res.status(500).json({ message: createError.message || "Failed to create conversation" });
    }

    return res.status(201).json({ conversation: createdConversation });
  } catch (err) {
    console.error("createOrGetConversation error", err);
    return res.status(500).json({ message: "Failed to create conversation" });
  }
};

const listMyConversations = async (req, res) => {
  try {
    const db = supabaseAdmin || supabase;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { data: conversations, error } = await db
      .from("conversations")
      .select("id, item_id, buyer_id, seller_id, last_message_at, created_at")
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("listMyConversations error", error);
      return res.status(500).json({ message: error.message || "Failed to load conversations" });
    }

    const safeConversations = conversations ?? [];
    const itemIds = [...new Set(safeConversations.map((entry) => entry.item_id).filter(Boolean))];
    const counterpartIds = safeConversations.map((entry) =>
      entry.buyer_id === userId ? entry.seller_id : entry.buyer_id
    );
    const uniqueCounterpartIds = [...new Set(counterpartIds.filter(Boolean))];

    const [{ data: items }, { data: profiles }] = await Promise.all([
      itemIds.length
        ? db.from("items").select("id, title, images_json").in("id", itemIds)
        : Promise.resolve({ data: [] }),
      uniqueCounterpartIds.length
        ? db.from("profiles").select("id, username, avatar_url").in("id", uniqueCounterpartIds)
        : Promise.resolve({ data: [] })
    ]);

    const itemById = new Map((items ?? []).map((entry) => [entry.id, entry]));
    const profileById = new Map((profiles ?? []).map((entry) => [entry.id, entry]));

    const enriched = safeConversations.map((entry) => {
      const counterpartId = entry.buyer_id === userId ? entry.seller_id : entry.buyer_id;
      const counterpart = profileById.get(counterpartId) || null;
      const item = itemById.get(entry.item_id) || null;
      const rawImages = Array.isArray(item?.images_json)
        ? item.images_json
        : typeof item?.images_json === "string"
          ? (() => {
              try {
                const parsed = JSON.parse(item.images_json);
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            })()
          : [];

      return {
        ...entry,
        counterpart: {
          id: counterpartId,
          username: counterpart?.username || null,
          avatar_url: counterpart?.avatar_url || null
        },
        item: item
          ? {
              id: item.id,
              title: item.title || null,
              image: rawImages[0] || null
            }
          : null
      };
    });

    return res.json({ conversations: enriched });
  } catch (err) {
    console.error("listMyConversations error", err);
    return res.status(500).json({ message: "Failed to load conversations" });
  }
};

const getConversationById = async (req, res) => {
  try {
    const db = supabaseAdmin || supabase;
    const userId = req.user?.id;
    const { id: conversationId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { data: conversation, error } = await db
      .from("conversations")
      .select("id, item_id, buyer_id, seller_id, last_message_at, created_at")
      .eq("id", conversationId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ message: error.message || "Failed to load conversation" });
    }

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
      return res.status(403).json({ message: "Forbidden conversation" });
    }

    const counterpartId =
      conversation.buyer_id === userId ? conversation.seller_id : conversation.buyer_id;

    const [{ data: counterpart }, { data: item }] = await Promise.all([
      db
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", counterpartId)
        .maybeSingle(),
      db
        .from("items")
        .select("id, title, images_json")
        .eq("id", conversation.item_id)
        .maybeSingle()
    ]);

    const rawImages = Array.isArray(item?.images_json)
      ? item.images_json
      : typeof item?.images_json === "string"
        ? (() => {
            try {
              const parsed = JSON.parse(item.images_json);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })()
        : [];

    return res.json({
      conversation: {
        ...conversation,
        counterpart: {
          id: counterpartId,
          username: counterpart?.username || null,
          avatar_url: counterpart?.avatar_url || null
        },
        item: item
          ? {
              id: item.id,
              title: item.title || null,
              image: rawImages[0] || null
            }
          : null
      }
    });
  } catch (err) {
    console.error("getConversationById error", err);
    return res.status(500).json({ message: "Failed to load conversation" });
  }
};

const listConversationMessages = async (req, res) => {
  try {
    const db = supabaseAdmin || supabase;
    const userId = req.user?.id;
    const { id: conversationId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const { data: conversation, error: conversationError } = await db
      .from("conversations")
      .select("id, buyer_id, seller_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (conversationError) {
      console.error("listConversationMessages conversation error", conversationError);
      return res.status(500).json({ message: conversationError.message || "Failed to load conversation" });
    }

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
      return res.status(403).json({ message: "Forbidden conversation" });
    }

    const { data: messages, error: messagesError } = await db
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("listConversationMessages messages error", messagesError);
      return res.status(500).json({ message: messagesError.message || "Failed to load messages" });
    }

    return res.json({ messages: messages ?? [] });
  } catch (err) {
    console.error("listConversationMessages error", err);
    return res.status(500).json({ message: "Failed to load messages" });
  }
};

const sendConversationMessage = async (req, res) => {
  try {
    const db = supabaseAdmin || supabase;
    const userId = req.user?.id;
    const { id: conversationId } = req.params;
    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    if (!body) {
      return res.status(400).json({ message: "body is required" });
    }

    const { data: conversation, error: conversationError } = await db
      .from("conversations")
      .select("id, buyer_id, seller_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (conversationError) {
      return res.status(500).json({ message: conversationError.message || "Failed to load conversation" });
    }

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
      return res.status(403).json({ message: "Forbidden conversation" });
    }

    const { data: message, error: messageError } = await db
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        body
      })
      .select("id, conversation_id, sender_id, body, created_at")
      .single();

    if (messageError) {
      return res.status(500).json({ message: messageError.message || "Failed to send message" });
    }

    await db
      .from("conversations")
      .update({ last_message_at: message.created_at })
      .eq("id", conversationId);

    return res.status(201).json({ message });
  } catch (err) {
    console.error("sendConversationMessage error", err);
    return res.status(500).json({ message: "Failed to send message" });
  }
};

module.exports = {
  createOrGetConversation,
  listMyConversations,
  getConversationById,
  listConversationMessages,
  sendConversationMessage
};
