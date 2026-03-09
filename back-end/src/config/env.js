const dotenv = require("dotenv");

dotenv.config();

const requiredEnv = ["SUPABASE_URL", "SUPABASE_ANON_KEY"];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`[env] Missing required environment variable: ${key}`);
  }
});

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 5000,
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*"
};

module.exports = { env };
