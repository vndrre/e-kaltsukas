const { Server } = require("socket.io");
const { supabase } = require("../services/supabaseClient");
const { env } = require("../config/env");

async function getUserFromToken(token) {
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

async function isConversationParticipant(conversationId, userId) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id")
    .eq("id", conversationId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.buyer_id === userId || data.seller_id === userId;
}

function toConversationRoom(conversationId) {
  return `conversation:${conversationId}`;
}

function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",")
    }
  });

  io.use(async (socket, next) => {
    try {
      const headerToken = (socket.handshake.auth?.token || "").replace(
        /^Bearer\s+/i,
        ""
      );
      const queryToken = (socket.handshake.query?.token || "").replace(
        /^Bearer\s+/i,
        ""
      );
      const token = headerToken || queryToken;

      const user = await getUserFromToken(token);

      if (!user) {
        return next(new Error("Unauthorized"));
      }

      socket.user = {
        id: user.id,
        email: user.email
      };

      return next();
    } catch (_error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);

    socket.on("chat:join", async ({ conversationId }, ack = () => {}) => {
      try {
        if (!conversationId) {
          return ack({ ok: false, error: "conversationId is required" });
        }

        const allowed = await isConversationParticipant(
          conversationId,
          socket.user.id
        );
        if (!allowed) {
          return ack({ ok: false, error: "Forbidden conversation" });
        }

        socket.join(toConversationRoom(conversationId));
        return ack({ ok: true });
      } catch (_error) {
        return ack({ ok: false, error: "Could not join conversation" });
      }
    });

    socket.on("chat:leave", ({ conversationId }, ack = () => {}) => {
      if (!conversationId) {
        return ack({ ok: false, error: "conversationId is required" });
      }

      socket.leave(toConversationRoom(conversationId));
      return ack({ ok: true });
    });

    socket.on("chat:send", async (payload = {}, ack = () => {}) => {
      try {
        const conversationId = payload.conversationId;
        const body = typeof payload.body === "string" ? payload.body.trim() : "";

        if (!conversationId) {
          return ack({ ok: false, error: "conversationId is required" });
        }

        if (!body) {
          return ack({ ok: false, error: "body is required" });
        }

        const allowed = await isConversationParticipant(
          conversationId,
          socket.user.id
        );
        if (!allowed) {
          return ack({ ok: false, error: "Forbidden conversation" });
        }

        const { data: message, error: msgError } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id: socket.user.id,
            body
          })
          .select("id, conversation_id, sender_id, body, created_at")
          .single();

        if (msgError || !message) {
          return ack({ ok: false, error: "Failed to persist message" });
        }

        await supabase
          .from("conversations")
          .update({ last_message_at: message.created_at })
          .eq("id", conversationId);

        io.to(toConversationRoom(conversationId)).emit("chat:message", message);

        return ack({ ok: true, message });
      } catch (_error) {
        return ack({ ok: false, error: "Could not send message" });
      }
    });
  });

  return io;
}

module.exports = { createSocketServer };
