const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  getMyWallet,
  getMyWalletTransactions,
  createWithdrawal
} = require("../controllers/walletController");

const router = express.Router();

router.get("/", authMiddleware, getMyWallet);
router.get("/transactions", authMiddleware, getMyWalletTransactions);
router.post("/withdrawals", authMiddleware, createWithdrawal);

module.exports = router;
