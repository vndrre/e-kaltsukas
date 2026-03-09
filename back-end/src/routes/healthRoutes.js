const express = require("express");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "marketplace-api",
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
