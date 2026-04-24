const express = require("express");
const { getMe, updateMe, uploadMyAvatar } = require("../controllers/userController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateMe);
router.post("/me/avatar", authMiddleware, upload.single("avatar"), uploadMyAvatar);

module.exports = router;
