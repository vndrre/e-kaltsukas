const express = require("express");
const {
  listCartItems,
  getCartCount,
  addToCart,
  updateCartItemQuantity,
  removeFromCart
} = require("../controllers/cartController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, listCartItems);
router.get("/count", authMiddleware, getCartCount);
router.post("/items", authMiddleware, addToCart);
router.patch("/items/:itemId", authMiddleware, updateCartItemQuantity);
router.delete("/items/:itemId", authMiddleware, removeFromCart);

module.exports = router;
