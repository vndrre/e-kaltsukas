const express = require("express");
const {
  getMe,
  updateMe,
  uploadMyAvatar,
  getPublicProfile,
  followUser,
  unfollowUser,
  listFollowers,
  listFollowing
} = require("../controllers/userController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateMe);
router.post("/me/avatar", authMiddleware, upload.single("avatar"), uploadMyAvatar);
router.get("/:id", authMiddleware, getPublicProfile);
router.post("/:id/follow", authMiddleware, followUser);
router.delete("/:id/follow", authMiddleware, unfollowUser);
router.get("/:id/followers", authMiddleware, listFollowers);
router.get("/:id/following", authMiddleware, listFollowing);

module.exports = router;
