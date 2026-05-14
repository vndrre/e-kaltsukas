const express = require("express");
const {
  listItems,
  getItemOptions,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  uploadItemImage,
  getListingDraft,
  upsertListingDraft,
  deleteListingDraft,
  listFavoriteItemIds,
  listFavoriteItems,
  isItemFavorited,
  addFavoriteItem,
  removeFavoriteItem
} = require("../controllers/itemController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/", listItems);
router.get("/options", getItemOptions);
router.get("/draft", authMiddleware, getListingDraft);
router.put("/draft", authMiddleware, upsertListingDraft);
router.delete("/draft", authMiddleware, deleteListingDraft);
router.get("/favorites", authMiddleware, listFavoriteItemIds);
router.get("/favorites/items", authMiddleware, listFavoriteItems);
router.get("/:id/favorite", authMiddleware, isItemFavorited);
router.post("/:id/favorite", authMiddleware, addFavoriteItem);
router.delete("/:id/favorite", authMiddleware, removeFavoriteItem);
router.get("/:id", getItemById);
router.post(
  "/upload-image",
  authMiddleware,
  upload.single("image"),
  uploadItemImage
);
router.post("/", authMiddleware, createItem);
router.put("/:id", authMiddleware, updateItem);
router.delete("/:id", authMiddleware, deleteItem);

module.exports = router;
