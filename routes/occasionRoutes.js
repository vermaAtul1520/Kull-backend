const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleware/isAuthenticated");
const isSuperOrCommunityAdmin = require("../middleware/isSuperOrCommunityAdmin");
const { queryParser } = require("../middleware/queryParser");
const occasionController = require("../controllers/occasionController");

// Create Occasion
router.post("/", isAuthenticated, isSuperOrCommunityAdmin, occasionController.createOccasion);

// List all Occasions
router.get(
  "/",
  isAuthenticated,
  queryParser({
    allowFilterFields: [
      "title",
      "category",
      "subCategory",
      "type",
      "language",
      "community",
      "createdBy",
      "createdAt",
    ],
    allowSortFields: ["title", "category", "createdAt"],
    maxLimit: 50,
  }),
  occasionController.getAllOccasions
);

// Get single Occasion
router.get("/:id", isAuthenticated, isSuperOrCommunityAdmin, occasionController.getOccasion);

// Update Occasion
router.put("/:id", isAuthenticated, isSuperOrCommunityAdmin, occasionController.updateOccasion);

// Delete Occasion
router.delete("/:id", isAuthenticated, isSuperOrCommunityAdmin, occasionController.deleteOccasion);

module.exports = router;
