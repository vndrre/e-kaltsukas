const dotenv = require("dotenv");

dotenv.config();

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 5000,
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ""
};

module.exports = { env };
