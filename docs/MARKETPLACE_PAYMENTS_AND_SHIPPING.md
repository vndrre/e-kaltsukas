# Marketplace payments & shipping (integration guide)

This document is for **future integration** of C2C (individual sellers) payments and shipping into **E-kaltsukas**. It consolidates recommended architecture, security practices, and Estonia-specific shipping notes. The codebase may not implement all of this yet; use this as the single reference when you wire Stripe and logistics.

---

## Goals

- **Buyers** pay in-app; **sellers** are paid only after agreed rules (e.g. buyer confirms receipt or carrier delivery + grace period).
- **Individuals only** for now (no shops); production would add stronger KYC and policies.
- **As secure as practical**: secrets on the server, verified webhooks, authenticated state transitions, server-calculated amounts.

---

## Architecture: payments (Stripe)

Stripe is **not** a legal escrow service. For marketplaces, use **Stripe Connect** so the **platform** controls **when** the seller receives funds.

### Recommended pattern: separate charge and transfer

1. **Charge the buyer** to the **platform** Stripe account (PaymentIntent / Checkout).
2. On success (see **Webhooks**), mark the order **paid** in your database.
3. Seller ships (see **Shipping**); buyer confirms receipt (or automation from tracking + SLA).
4. Your backend creates a **Transfer** to the seller’s **connected account** (minus your **application fee** if you take commission).
5. Cancellations / refunds: **refund** the PaymentIntent (or partial) per your rules **before** transferring, or use transfer reversal patterns documented by Stripe where applicable.

**Docs:** [Connect](https://docs.stripe.com/connect) · [Separate charges and transfers](https://docs.stripe.com/connect/separate-charges-and-transfers) · [Express accounts](https://docs.stripe.com/connect/express-accounts) · [Testing Connect](https://docs.stripe.com/connect/testing)

### Why not rely only on “manual capture”?

**Manual capture** delays capturing the card for a **short** window (on the order of days). Real shipping + buyer confirmation usually needs **longer**. Prefer **capture to platform + delayed Transfer** to the connected account.

### Simpler demo (school / prototype)

If Connect is out of scope temporarily:

- Use **test mode** PaymentIntents to the **platform** account only.
- In the database, model `payout_status`: `held` → `released` and **document** that production would use Connect + `Transfer`.

---

## Order state machine (suggested)

Use explicit statuses in PostgreSQL (or Supabase); transitions only via **authenticated backend** routes.

| Status | Meaning |
|--------|--------|
| `awaiting_payment` | Checkout started or abandoned |
| `paid_awaiting_shipment` | Payment succeeded (webhook) |
| `shipped` | Seller marked shipped / tracking set |
| `awaiting_buyer_confirmation` | Optional sub-state if you split from `shipped` |
| `completed` | Buyer confirmed (or auto-confirmed); **Transfer** executed |
| `cancelled` / `refunded` | Per policy |

**Rule of thumb:** only the **buyer** can call “confirm receipt” for that order; only the **seller** can mark shipped (or your admin).

---

## Webhooks (required for correctness)

- Listen at minimum for **`payment_intent.succeeded`** and failure/cancel events relevant to your flow.
- **Verify** the webhook signature with the **webhook signing secret** — never trust raw body without verification.  
  **Docs:** [Webhooks](https://docs.stripe.com/webhooks) · [Verify signatures](https://docs.stripe.com/webhooks/signatures)

Local testing: [Stripe CLI](https://docs.stripe.com/stripe-cli) (`stripe listen --forward-to ...`).

---

## Security checklist

| Topic | Action |
|--------|--------|
| API keys | **`sk_live_` / `sk_test_`** and webhook secret only on the **server** (e.g. `back-end/.env`, never committed). Mobile app talks to **your API**, not Stripe with secret keys. |
| Amounts | Compute **charge amount on the server** from DB (listing price, shipping, fees). Do not trust the client for the final total. |
| Idempotency | Use **Idempotency-Key** on Stripe mutations (create PaymentIntent, Transfer, Refund) to survive retries and double-clicks. |
| Confirm receipt | **JWT / session** required; `order.buyer_id === current_user.id` and valid status (e.g. `shipped`). |
| Connect onboarding | Use **Express** (or Custom if you need full control); onboard sellers through Stripe-hosted flows in production. |

---

## Shipping (Estonia / EU context)

### Production-oriented options

- **Carriers:** Omniva, SmartPOST, DPD, Itella, etc. Cross-border sales need correct **customs** data where applicable (value, description, HS codes as required).
- **Integrations:**
  - **Aggregator APIs** (e.g. Shipmondo, Sendcloud-class services): one integration, labels + tracking webhooks.
  - **Direct carrier APIs:** more work, sometimes better economics at scale.

### Demo / school project

- Skip live carrier APIs unless required for grading.
- Fields: `tracking_number` (text), `carrier` (enum), `shipped_at`; seller **“Mark as shipped”**; optional link to carrier’s public tracking URL.
- **Buyer “Confirm receipt”** drives payout (or combine with delivery scan + timeout in a later version).

---

## Environment variables (example — no real secrets in git)

Add when implementing (names are illustrative):

```env
# Stripe (test mode for development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...   # safe for client if using Payment Element / native SDK

# Optional: Connect
# STRIPE_CONNECT_CLIENT_ID=...      # if using OAuth-style flows where applicable
```

**Front-end:** only **publishable** key and **client**-safe values; payment confirmation still relies on backend + webhooks.

---

## Suggested implementation order (this repo)

1. **Database:** `orders` (or extend existing orders) with `buyer_id`, `seller_id`, `listing_id`, amounts, status, `stripe_payment_intent_id`, optional `stripe_transfer_id`, shipping fields.
2. **Backend:** `POST /api/checkout` or similar — auth, load listing, create PaymentIntent (or Checkout Session), return client secret / URL.
3. **Backend:** `POST /webhooks/stripe` — verify signature, update order on `payment_intent.succeeded`.
4. **Backend:** `POST /api/orders/:id/mark-shipped` (seller), `POST /api/orders/:id/confirm-receipt` (buyer) — authz checks, then create **Transfer** (Connect) or update demo payout state.
5. **Mobile (Expo):** checkout UI, order detail screens, buttons for shipped / confirm receipt.
6. **Stripe Dashboard:** test mode, test cards, test connected accounts for sellers.

---

## Reference links

- [Stripe testing](https://docs.stripe.com/testing)
- [API keys](https://docs.stripe.com/keys)
- [PaymentIntents](https://docs.stripe.com/payments/paymentintents)
- [Refunds](https://docs.stripe.com/refunds)
- [Connect account types](https://docs.stripe.com/connect/accounts)

---

## Disclaimer

This guide is **not** legal or tax advice. A real marketplace needs **terms of sale**, privacy policy, dispute flow, and compliance with **EU consumer** and **PSD2** rules as applicable. For a school project, document assumptions and stay in **Stripe test mode** until you intentionally go live.
