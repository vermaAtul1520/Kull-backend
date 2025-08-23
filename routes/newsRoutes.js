const express = require("express");
const router = express.Router();
const {
  createNews,
  updateNews,
  deleteNews,
  getCommunityNews,
  getSingleNews
} = require("../controllers/newsController");

const isAuthenticated = require("../middleware/isAuthenticated");
const isSuperOrCommunityAdmin = require("../middleware/isSuperOrCommunityAdmin");

// Create news
router.post("/", isAuthenticated, isSuperOrCommunityAdmin, createNews);

// Update news
router.put("/:id", isAuthenticated, isSuperOrCommunityAdmin, updateNews);

// Delete news
router.delete("/:id", isAuthenticated, isSuperOrCommunityAdmin, deleteNews);

// Get all news for community
router.get("/", isAuthenticated, getCommunityNews);

// Get single news
router.get("/:id", isAuthenticated, getSingleNews);

module.exports = router;
