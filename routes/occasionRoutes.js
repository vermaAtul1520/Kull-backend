const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleware/isAuthenticated");
const isSuperOrCommunityAdmin = require("../middleware/isSuperOrCommunityAdmin");
const { queryParser } = require("../middleware/queryParser");
const occasionController = require("../controllers/occasionController");

// ------------------------
// Occasions Routes
// ------------------------

// Create single Occasion
router.post(
  "/",
  isAuthenticated,
  isSuperOrCommunityAdmin,
  occasionController.createOccasion
);

// Bulk upload Occasions
router.post(
  "/bulk-upload",
  isAuthenticated,
  isSuperOrCommunityAdmin,
  occasionController.bulkUploadOccasions
);

// List all Occasions with filter, sort, pagination
router.get(
  "/",
  isAuthenticated,
  queryParser({
    allowFilterFields: [
      "occasionType",
      "category",
      "gender",
      "gotra",
      "subGotra",
      "community",
      "createdBy",
      "createdAt",
    ],
    allowSortFields: ["occasionType", "category", "createdAt"],
    maxLimit: 50,
  }),
  occasionController.getAllOccasions
);

// Get single Occasion (All authenticated users)
router.get(
  "/:id",
  isAuthenticated,
  occasionController.getOccasion
);

// Update Occasion
router.put(
  "/:id",
  isAuthenticated,
  isSuperOrCommunityAdmin,
  occasionController.updateOccasion
);

// Delete Occasion
router.delete(
  "/:id",
  isAuthenticated,
  isSuperOrCommunityAdmin,
  occasionController.deleteOccasion
);

module.exports = router;
