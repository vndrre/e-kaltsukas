const Stripe = require("stripe");
const { env } = require("../config/env");

let stripeClient;

const getStripe = () => {
  if (!env.STRIPE_SECRET_KEY) {
    const error = new Error("Stripe is not configured on the server");
    error.code = "STRIPE_NOT_CONFIGURED";
    throw error;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
};

const getStripePublishableKey = () => env.STRIPE_PUBLISHABLE_KEY || "";

const isStripeConfigured = () => Boolean(env.STRIPE_SECRET_KEY && getStripePublishableKey());

module.exports = {
  getStripe,
  getStripePublishableKey,
  isStripeConfigured
};
