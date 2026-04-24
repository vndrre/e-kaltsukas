const express = require("express");
const { cloudinary } = require("../services/cloudinaryClient");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "marketplace-api",
    timestamp: new Date().toISOString()
  });
});

router.get("/health/cloudinary", async (req, res) => {
  const cfg = cloudinary.config();
  const hasCloudName = Boolean(cfg.cloud_name);
  const hasApiKey = Boolean(cfg.api_key);
  const hasApiSecret = Boolean(cfg.api_secret);
  const configValid = hasCloudName && hasApiKey && hasApiSecret;
  const shouldPing = req.query.ping === "1" || req.query.ping === "true";

  if (!configValid) {
    return res.status(500).json({
      status: "error",
      provider: "cloudinary",
      message: "Cloudinary is not fully configured",
      checks: {
        hasCloudName,
        hasApiKey,
        hasApiSecret
      }
    });
  }

  if (!shouldPing) {
    return res.status(200).json({
      status: "ok",
      provider: "cloudinary",
      message: "Cloudinary configuration is loaded",
      checks: {
        hasCloudName,
        hasApiKey,
        hasApiSecret
      }
    });
  }

  try {
    await cloudinary.api.ping();
    return res.status(200).json({
      status: "ok",
      provider: "cloudinary",
      message: "Cloudinary config is loaded and credentials are valid"
    });
  } catch (error) {
    const nestedError = error?.error || {};
    const code = error?.http_code || nestedError?.http_code || 500;
    return res.status(code).json({
      status: "error",
      provider: "cloudinary",
      message: error?.message || nestedError?.message || "Cloudinary ping failed"
    });
  }
});

module.exports = router;
