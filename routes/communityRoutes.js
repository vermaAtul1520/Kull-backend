const express = require("express");
const router = express.Router();
const communityController = require("../controllers/communityController");
const isSuperOrCommunityAdmin = require("../middleware/isSuperOrCommunityAdmin");
const isAuthenticated = require("../middleware/isAuthenticated");

// POST /api/community
router.post("/create", communityController.createCommunity);

// Community configuration
// Create
router.post("/:communityId/configuration", isAuthenticated, isSuperOrCommunityAdmin, communityController.createConfiguration);

// Get Configuration by Community ID
router.get("/:communityId/configuration", isAuthenticated, communityController.getConfigurationByCommunityId);

// Update Configuration
router.put("/:communityId/configuration", isAuthenticated, isSuperOrCommunityAdmin, communityController.updateConfiguration);

module.exports = router;