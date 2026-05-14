# Marketplace payments & shipping (integration guide)

This document is for **future integration** of C2C (individual sellers) payments and shipping into **E-kaltsukas**. It consolidates recommended architecture, security practices, and Estonia-specific shipping notes. The codebase may not implement all of this yet; use this as the single reference when you wire payments, wallets, and logistics.

---

## Goals

- **Buyers** pay in-app; **sellers** are credited only after the buyer confirms they received the item (or an agreed auto-confirm rule after shipment).
- **Wallet balances** hold seller earnings until withdrawal, so funds stay on the platform until release and payout are intentional steps.
- **Individuals only** for now (no shops); production would add stronger KYC and policies.
- **As secure as practical**: secrets on the server, verified webhooks, authenticated state transitions, server-calculated amounts.
- **Shipping** is **demo-oriented** in this project: there are no real products or live carrier contracts, so the flow should look credible in the UI without depending on production logistics.

---

## Architecture: payments (wallet + hold)

The marketplace uses an **internal wallet** per user, not immediate payout to the seller at checkout. Buyer payment is **held** (escrow-style) until the buyer confirms receipt; only then is the seller’s **available wallet balance** increased. Sellers **withdraw** from that balance when they choose (subject to minimums, verification, and your payout provider).

This reduces common C2C fraud patterns: sellers are not paid before the buyer acknowledges delivery, and disputes can be handled while funds are still held.

### Money flow (recommended)

1. **Buyer pays** at checkout (e.g. Stripe PaymentIntent / Checkout to the **platform** account). On success (see **Webhooks**), mark the order **paid** and record an **order hold** (or ledger entry): buyer charged, seller **not** yet credited.
2. **Seller ships** (see **Shipping** — demo fields only for this project).
3. **Buyer confirms receipt** (authenticated, buyer-only). Backend **releases** the hold: credit the seller’s **wallet balance** (minus platform fee if any). Write an **immutable ledger** row for audit (order id, amount, fee, timestamp).
4. **Seller withdraws** when ready: create a **withdrawal request** from available balance; on success, debit wallet and pay out via your provider (e.g. Stripe Connect payout, bank transfer in production). In **test/demo**, simulate success or use test-mode payouts only.
5. **Cancellations / refunds** before release: refund the buyer per policy and **do not** credit the seller wallet. After release, handle chargebacks and disputes per terms (may require negative balance or holds on future sales).

**Docs (when using Stripe for pay-in / pay-out):** [Connect](https://docs.stripe.com/connect) · [PaymentIntents](https://docs.stripe.com/payments/paymentintents) · [Testing](https://docs.stripe.com/testing)

### Wallet model (suggested)

| Concept | Meaning |
|--------|--------|
| `wallet_balance` (or `available_balance`) | Funds the user can withdraw after completed sales (and top-ups if you allow them). |
| `pending_balance` (optional) | Earnings from paid orders not yet released (buyer has not confirmed). |
| Ledger / transactions | Append-only log: `payment_in`, `order_hold`, `order_release`, `withdrawal`, `refund`, `fee`. |

**Rule of thumb:** never mutate balance without a matching ledger entry; use **database transactions** when moving from hold → wallet or wallet → withdrawal.

### Why wallet + buyer confirmation?

- **Fraud / non-delivery:** seller is not paid until the buyer confirms (or your timeout/auto-confirm policy after demo “shipped”).
- **Clear UX:** buyers see “payment held until you confirm”; sellers see “pending” then “available to withdraw”.
- **Withdrawals decoupled from each order:** one payout batch or on-demand withdrawal without tying every order to an instant external transfer.

### Demo / school project

- Use **test mode** for card payments to the platform only.
- Persist `orders`, `wallet_balances`, and `wallet_transactions` (or equivalent) in PostgreSQL / Supabase.
- **Withdrawal** can be a button that debits balance and sets status `completed` in test data, with a note that production would call Stripe Connect or a bank payout API.
- Document assumptions in the repo; stay in **test mode** until you intentionally go live.

---

## Order state machine (suggested)

Use explicit statuses in PostgreSQL (or Supabase); transitions only via **authenticated backend** routes.

| Status | Meaning |
|--------|--------|
| `awaiting_payment` | Checkout started or abandoned |
| `paid_awaiting_shipment` | Payment succeeded (webhook); funds **held**, seller wallet **not** credited |
| `shipped` | Seller marked shipped / demo tracking set |
| `awaiting_buyer_confirmation` | Optional sub-state if you split from `shipped` |
| `completed` | Buyer confirmed (or auto-confirmed); hold **released** to seller **wallet** |
| `cancelled` / `refunded` | Per policy; buyer refunded, no wallet credit |

**Rule of thumb:** only the **buyer** can call “confirm receipt” for that order; only the **seller** can mark shipped (or your admin). **Withdrawal** is a separate action for the seller when `wallet` balance allows.

---

## Webhooks (required for correctness)

- Listen at minimum for **`payment_intent.succeeded`** and failure/cancel events relevant to your flow.
- **Verify** the webhook signature with the **webhook signing secret** — never trust raw body without verification.  
  **Docs:** [Webhooks](https://docs.stripe.com/webhooks) · [Verify signatures](https://docs.stripe.com/webhooks/signatures)

Local testing: [Stripe CLI](https://docs.stripe.com/stripe-cli) (`stripe listen --forward-to ...`).

Wallet **release** and **withdrawal** are **your** backend actions after auth checks; do not rely on the client alone to credit balances.

---

## Security checklist

| Topic | Action |
|--------|--------|
| API keys | **`sk_live_` / `sk_test_`** and webhook secret only on the **server** (e.g. `back-end/.env`, never committed). Mobile app talks to **your API**, not payment providers with secret keys. |
| Amounts | Compute **charge amount on the server** from DB (listing price, shipping, fees). Do not trust the client for the final total. |
| Idempotency | Use **Idempotency-Key** on payment and payout mutations; use unique constraints or idempotency keys on ledger writes to prevent double release or double withdrawal. |
| Confirm receipt | **JWT / session** required; `order.buyer_id === current_user.id` and valid status (e.g. `shipped`). |
| Wallet credit | Only backend paths after confirm (or auto-confirm job); seller cannot self-credit. |
| Withdrawal | Authenticate seller; debit only if `available_balance >= amount`; prevent concurrent double withdrawal (row lock or status machine). |
| Payout onboarding | In production, verify identity / Connect Express (or equivalent) before allowing withdrawal to external accounts. |

---

## Shipping (demo for this project)

There are **no real products** or live carrier contracts in scope. Shipping exists to **demo the order lifecycle** and to gate **buyer confirmation** and **wallet release**, not to produce labels or track parcels in production.

### What to build for the demo

- **Fields on the order:** `carrier` (enum or text), `tracking_number` (free text), `shipped_at`, optional `tracking_url` (link to a carrier’s public tracking page or a placeholder).
- **Seller action:** **“Mark as shipped”** — sets status to `shipped` and fills demo tracking; no call to Omniva, SmartPOST, DPD, etc.
- **Buyer action:** **“Confirm receipt”** after `shipped` (or after a short demo delay if you want to simulate transit). That triggers **wallet release** to the seller.
- **Optional polish:** show a timeline (paid → shipped → confirmed); fake tracking number format; admin override to mark shipped or complete for testing.

### Production-oriented options (later)

If you extend beyond the school/demo scope:

- **Carriers (Estonia / EU):** Omniva, SmartPOST, DPD, Itella, etc. Cross-border sales need correct **customs** data where applicable.
- **Integrations:** aggregator APIs (e.g. Shipmondo, Sendcloud-class services) for labels + tracking webhooks, or direct carrier APIs at scale.
- **Auto-confirm:** carrier delivery scan + grace period instead of manual buyer tap (still release to **wallet**, not instant external payout unless withdrawal is requested).

---

## Environment variables (example — no real secrets in git)

Add when implementing (names are illustrative):

```env
# Stripe (test mode for development — pay-in and optional payouts)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...   # safe for client if using Payment Element / native SDK

# Optional: Connect / payouts for withdrawals
# STRIPE_CONNECT_CLIENT_ID=...
```

**Front-end:** only **publishable** key and **client**-safe values; payment confirmation, wallet credit, and withdrawal still rely on backend + webhooks.

---

## Suggested implementation order (this repo)

1. **Database:** `users` or profiles with wallet fields; `wallet_transactions` (ledger); `orders` with `buyer_id`, `seller_id`, `listing_id`, amounts, status, `stripe_payment_intent_id`, shipping demo fields, `released_at` / `wallet_transaction_id` when completed.
2. **Backend:** `POST /api/checkout` — auth, load listing, create PaymentIntent, return client secret / URL; on webhook success, set order `paid_awaiting_shipment` and record hold (no seller wallet credit).
3. **Backend:** `POST /webhooks/stripe` — verify signature, update order on `payment_intent.succeeded`.
4. **Backend:** `POST /api/orders/:id/mark-shipped` (seller), `POST /api/orders/:id/confirm-receipt` (buyer) — authz checks, then **release to seller wallet** (ledger + balance update).
5. **Backend:** `GET /api/wallet` (balance + history), `POST /api/wallet/withdraw` (seller, demo or test payout).
6. **Mobile (Expo):** checkout UI, order detail (demo tracking), confirm receipt, wallet screen, withdraw button (demo).
7. **Stripe Dashboard:** test mode, test cards; document that withdrawals map to Connect/payout in production.

---

## Reference links

- [Stripe testing](https://docs.stripe.com/testing)
- [API keys](https://docs.stripe.com/keys)
- [PaymentIntents](https://docs.stripe.com/payments/paymentintents)
- [Refunds](https://docs.stripe.com/refunds)
- [Connect account types](https://docs.stripe.com/connect/accounts)

---

## Disclaimer

This guide is **not** legal or tax advice. A real marketplace needs **terms of sale**, privacy policy, dispute flow, and compliance with **EU consumer** and **PSD2** rules as applicable. Wallet and hold flows must match what you promise users in writing. For a school project, document assumptions and stay in **Stripe test mode** until you intentionally go live.
