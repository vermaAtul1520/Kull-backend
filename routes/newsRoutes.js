const express = require("express");
const router = express.Router();
const {
  createNews,
  updateNews,
  deleteNews,
  getCommunityNews,
  getSingleNews,
  getNewsHeadlines
} = require("../controllers/newsController");

const isAuthenticated = require("../middleware/isAuthenticated");
const isSuperOrCommunityAdmin = require("../middleware/isSuperOrCommunityAdmin");

// Get news headlines for slider (Issue #18 fix)
router.get("/community/:communityId/headlines", isAuthenticated, getNewsHeadlines);

// Get news by community ID
router.get("/community/:communityId", isAuthenticated, getCommunityNews);

// Create news for a specific community
router.post("/community/:communityId", isAuthenticated, isSuperOrCommunityAdmin, createNews);

// Get single news by ID
router.get("/:id", isAuthenticated, getSingleNews);

// Update news
router.put("/:id", isAuthenticated, isSuperOrCommunityAdmin, updateNews);

// Delete news
router.delete("/:id", isAuthenticated, isSuperOrCommunityAdmin, deleteNews);

module.exports = router;
