const express = require("express");
const router = express.Router();
const donationController = require("../controllers/donationController");
const isAuthenticated = require("../middleware/isAuthenticated");

router.get("/", isAuthenticated,donationController.getAllDonations);

// Only superadmin or communityAdmin can create donation
router.post("/", isAuthenticated, donationController.createDonation);

// Edit own donation (superadmin can edit all)
router.put("/:id", isAuthenticated, donationController.updateDonation);

// Delete own donation (soft delete optional)
router.delete("/:id", isAuthenticated, donationController.deleteDonation);

module.exports = router;
