const express = require("express");
const router = express.Router();
const communityController = require("../controllers/communityController");
const bhajanController = require("../controllers/bhajanController");
const isSuperOrCommunityAdmin = require("../middleware/isSuperOrCommunityAdmin");
const isAuthenticated = require("../middleware/isAuthenticated");


// POST /api/community
router.post("/create", communityController.createCommunity);

// Community configuration
// Create
router.post("/:communityId/configuration", isAuthenticated, isSuperOrCommunityAdmin, communityController.createOrUpdateConfiguration);

// Get Configuration by Community ID
router.get("/:communityId/configuration", isAuthenticated, communityController.getConfigurationByCommunityId);
router.get("/:communityId/users", isAuthenticated, communityController.getUsersByCommunityId);

// Bhajans
router.post("/:communityId/bhajans",isAuthenticated, isSuperOrCommunityAdmin, bhajanController.createBhajan);
router.get("/:communityId/bhajans",isAuthenticated, bhajanController.getBhajansByCommunity);
router.get("/bhajans/:id",isAuthenticated, bhajanController.getBhajanById);
router.put("/bhajans/:id",isAuthenticated, bhajanController.updateBhajan);
router.delete("/bhajans/:id",isAuthenticated, isSuperOrCommunityAdmin, bhajanController.deleteBhajan);



module.exports = router;