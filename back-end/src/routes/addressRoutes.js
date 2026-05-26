const express = require("express");
const { searchAddressSuggestions } = require("../controllers/addressController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/search", authMiddleware, searchAddressSuggestions);

module.exports = router;
