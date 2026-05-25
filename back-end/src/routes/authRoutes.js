const express = require("express");
const { login, refresh, signup } = require("../controllers/authController");

const router = express.Router();

router.post("/login", login);
router.post("/refresh", refresh);
router.post("/signup", signup);

module.exports = router;
