const { env } = require("../config/env");
const { supabase, supabaseAdmin } = require("../services/supabaseClient");
const {
  fulfillPaidCheckout,
  loadCheckoutSession,
  normalizeShippingAddress
} = require("../services/checkoutService");
const { getStripe } = require("../services/stripeService");

const db = supabaseAdmin ?? supabase;

const handleStripeWebhook = async (req, res) => {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ message: "Stripe webhooks are not configured" });
  }

  const signature = req.headers["stripe-signature"];
  if (!signature) {
    return res.status(400).json({ message: "Missing Stripe signature" });
  }

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("handleStripeWebhook signature error", err);
    return res.status(400).json({ message: "Invalid Stripe webhook signature" });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const userId = paymentIntent.metadata?.buyer_id;
      if (!userId) {
        return res.json({ received: true });
      }

      const session = await loadCheckoutSession(db, paymentIntent.id);
      const shippingAddress = normalizeShippingAddress(session?.shipping_address ?? null);
      if (!shippingAddress) {
        console.error("handleStripeWebhook missing shipping for", paymentIntent.id);
        return res.json({ received: true });
      }

      await fulfillPaidCheckout(db, {
        userId,
        paymentIntentId: paymentIntent.id,
        shippingAddress
      });
    }
  } catch (err) {
    console.error("handleStripeWebhook handler error", err);
    return res.status(500).json({ message: "Webhook handler failed" });
  }

  return res.json({ received: true });
};

module.exports = {
  handleStripeWebhook
};
