const {
  centsToAmount,
  getWalletSummary,
  listWalletTransactions,
  requestWithdrawal,
  handleWalletError,
  MIN_WITHDRAWAL_CENTS
} = require("../services/walletService");

const getMyWallet = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const wallet = await getWalletSummary(userId);
    return res.json({ wallet });
  } catch (error) {
    console.error("getMyWallet error", error);
    return handleWalletError(error, res, "Failed to load wallet");
  }
};

const getMyWalletTransactions = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const limit = Math.min(Math.max(Number(req.query?.limit) || 20, 1), 50);
    const transactions = await listWalletTransactions(userId, limit);
    return res.json({ transactions });
  } catch (error) {
    console.error("getMyWalletTransactions error", error);
    return handleWalletError(error, res, "Failed to load wallet activity");
  }
};

const createWithdrawal = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const rawAmount = req.body?.amount ?? req.body?.amountCents;
    const amount = Number(rawAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "amount must be a valid number greater than 0" });
    }

    const amountCents = Number.isInteger(amount) && amount >= MIN_WITHDRAWAL_CENTS
      ? amount
      : Math.round(amount * 100);

    const transaction = await requestWithdrawal({ userId, amountCents });
    const wallet = await getWalletSummary(userId);

    return res.status(201).json({
      transaction,
      wallet,
      message: `€${centsToAmount(amountCents).toFixed(2)} sent to your linked bank account.`
    });
  } catch (error) {
    console.error("createWithdrawal error", error);
    return handleWalletError(error, res, "Failed to process withdrawal");
  }
};

module.exports = {
  getMyWallet,
  getMyWalletTransactions,
  createWithdrawal
};
