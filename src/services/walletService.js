const { supabase, supabaseAdmin } = require("./supabaseClient");

const db = supabaseAdmin ?? supabase;
const MIN_WITHDRAWAL_CENTS = 100;
const PENDING_ORDER_STATUSES = ["paid", "shipped"];

const centsToAmount = (cents) => Number((cents / 100).toFixed(2));

const mapTransactionRow = (row) => ({
  id: row.id,
  type: row.type,
  amountCents: row.amount_cents,
  amount: centsToAmount(row.amount_cents),
  direction: row.direction,
  status: row.status,
  orderId: row.order_id ?? null,
  description: row.description ?? null,
  createdAt: row.created_at
});

const ensureWallet = async (userId) => {
  const { data: existing, error: existingError } = await db
    .from("wallet_balances")
    .select("user_id, available_cents, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing;
  }

  const { data, error } = await db
    .from("wallet_balances")
    .insert({
      user_id: userId,
      available_cents: 0
    })
    .select("user_id, available_cents, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const getPendingEarningsCents = async (userId) => {
  const { data, error } = await db
    .from("orders")
    .select("price_cents")
    .eq("seller_id", userId)
    .in("status", PENDING_ORDER_STATUSES)
    .eq("payout_status", "held");

  if (error) {
    throw error;
  }

  return (data ?? []).reduce((sum, row) => sum + (row.price_cents ?? 0), 0);
};

const getWalletSummary = async (userId) => {
  const [wallet, pendingCents] = await Promise.all([
    ensureWallet(userId),
    getPendingEarningsCents(userId)
  ]);

  return {
    availableCents: wallet.available_cents ?? 0,
    pendingCents,
    available: centsToAmount(wallet.available_cents ?? 0),
    pending: centsToAmount(pendingCents),
    currency: "EUR",
    updatedAt: wallet.updated_at ?? null
  };
};

const listWalletTransactions = async (userId, limit = 20) => {
  const { data, error } = await db
    .from("wallet_transactions")
    .select("id, type, amount_cents, direction, status, order_id, description, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapTransactionRow);
};

const creditOrderRelease = async ({ sellerId, orderId, amountCents }) => {
  if (!sellerId || !orderId || !Number.isInteger(amountCents) || amountCents <= 0) {
    const error = new Error("Invalid order release payload");
    error.statusCode = 400;
    throw error;
  }

  const { data: existingRelease, error: existingReleaseError } = await db
    .from("wallet_transactions")
    .select("id")
    .eq("order_id", orderId)
    .eq("type", "order_release")
    .maybeSingle();

  if (existingReleaseError) {
    throw existingReleaseError;
  }

  if (existingRelease) {
    return { alreadyReleased: true };
  }

  const wallet = await ensureWallet(sellerId);
  const nextAvailableCents = (wallet.available_cents ?? 0) + amountCents;

  const { error: balanceError } = await db
    .from("wallet_balances")
    .update({
      available_cents: nextAvailableCents,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", sellerId);

  if (balanceError) {
    throw balanceError;
  }

  const { error: transactionError } = await db.from("wallet_transactions").insert({
    user_id: sellerId,
    type: "order_release",
    amount_cents: amountCents,
    direction: "credit",
    status: "completed",
    order_id: orderId,
    description: "Sale completed"
  });

  if (transactionError) {
    throw transactionError;
  }

  return { alreadyReleased: false };
};

const requestWithdrawal = async ({ userId, amountCents }) => {
  if (!Number.isInteger(amountCents) || amountCents < MIN_WITHDRAWAL_CENTS) {
    const error = new Error(`Minimum withdrawal is €${centsToAmount(MIN_WITHDRAWAL_CENTS).toFixed(2)}`);
    error.statusCode = 400;
    throw error;
  }

  const wallet = await ensureWallet(userId);

  if ((wallet.available_cents ?? 0) < amountCents) {
    const error = new Error("Insufficient wallet balance");
    error.statusCode = 400;
    throw error;
  }

  const nextAvailableCents = wallet.available_cents - amountCents;

  const { error: balanceError } = await db
    .from("wallet_balances")
    .update({
      available_cents: nextAvailableCents,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId);

  if (balanceError) {
    throw balanceError;
  }

  const { data: transaction, error: transactionError } = await db
    .from("wallet_transactions")
    .insert({
      user_id: userId,
      type: "withdrawal",
      amount_cents: amountCents,
      direction: "debit",
      status: "completed",
      description: "Withdrawal to linked bank account"
    })
    .select("id, type, amount_cents, direction, status, order_id, description, created_at")
    .single();

  if (transactionError) {
    throw transactionError;
  }

  return mapTransactionRow(transaction);
};

const handleWalletError = (error, res, fallbackMessage) => {
  if (error?.code === "42P01") {
    return res.status(500).json({
      message: "Wallet tables are missing. Run wallet schema SQL migration."
    });
  }

  const statusCode = error?.statusCode || 500;
  return res.status(statusCode).json({
    message: error?.message || fallbackMessage
  });
};

module.exports = {
  MIN_WITHDRAWAL_CENTS,
  centsToAmount,
  getWalletSummary,
  listWalletTransactions,
  creditOrderRelease,
  requestWithdrawal,
  handleWalletError
};
