const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  createOrGetConversation,
  listMyConversations,
  getConversationById,
  listConversationMessages,
  sendConversationMessage
} = require("../controllers/chatController");

const router = express.Router();

router.post("/conversations", authMiddleware, createOrGetConversation);
router.get("/conversations", authMiddleware, listMyConversations);
router.get("/conversations/:id", authMiddleware, getConversationById);
router.get("/conversations/:id/messages", authMiddleware, listConversationMessages);
router.post("/conversations/:id/messages", authMiddleware, sendConversationMessage);

module.exports = router;
