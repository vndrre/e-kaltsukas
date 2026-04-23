const express = require("express");
const {
  listItems,
  getItemById,
  createItem,
  uploadItemImage
} = require("../controllers/itemController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/", listItems);
router.get("/:id", getItemById);
router.post(
  "/upload-image",
  authMiddleware,
  upload.single("image"),
  uploadItemImage
);
router.post("/", authMiddleware, createItem);

module.exports = router;
