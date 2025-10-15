const express = require("express");
const router = express.Router();
const donationController = require("../controllers/donationController");
const isAuthenticated = require("../middleware/isAuthenticated");
const isSuperOrCommunityAdmin = require("../middleware/isSuperOrCommunityAdmin");

// Get donations by community ID
router.get("/community/:communityId", isAuthenticated, donationController.getDonationsByCommunity);

// Create donation for a specific community
router.post("/community/:communityId", isAuthenticated, isSuperOrCommunityAdmin, donationController.createDonation);

// Get single donation by ID
router.get("/:id", isAuthenticated, donationController.getDonationById);

// Update donation
router.put("/:id", isAuthenticated, isSuperOrCommunityAdmin, donationController.updateDonation);

// Delete donation
router.delete("/:id", isAuthenticated, isSuperOrCommunityAdmin, donationController.deleteDonation);

module.exports = router;
