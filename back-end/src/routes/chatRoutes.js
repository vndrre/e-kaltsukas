const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  createOrGetConversation,
  listMyConversations,
  getConversationById,
  listConversationMessages,
  sendConversationMessage,
  createOffer,
  updateOffer
} = require("../controllers/chatController");

const router = express.Router();

router.post("/conversations", authMiddleware, createOrGetConversation);
router.get("/conversations", authMiddleware, listMyConversations);
router.get("/conversations/:id", authMiddleware, getConversationById);
router.get("/conversations/:id/messages", authMiddleware, listConversationMessages);
router.post("/conversations/:id/messages", authMiddleware, sendConversationMessage);
router.post("/conversations/:id/offers", authMiddleware, createOffer);
router.patch("/conversations/:id/offers/:messageId", authMiddleware, updateOffer);

module.exports = router;
