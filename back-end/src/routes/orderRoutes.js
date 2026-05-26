const express = require("express");
const {
  checkoutFromCart,
  listOrders,
  getOrderById,
  markOrderShipped,
  confirmOrderReceipt
} = require("../controllers/orderController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/checkout", authMiddleware, checkoutFromCart);
router.get("/", authMiddleware, listOrders);
router.get("/:orderId", authMiddleware, getOrderById);
router.post("/:orderId/mark-shipped", authMiddleware, markOrderShipped);
router.post("/:orderId/confirm-receipt", authMiddleware, confirmOrderReceipt);

module.exports = router;
