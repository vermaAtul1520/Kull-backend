const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleware/isAuthenticated");
const isSuperOrCommunityAdmin = require("../middleware/isSuperOrCommunityAdmin");
const { queryParser } = require("../middleware/queryParser");
const occasionCategoryController = require("../controllers/occasionCategoryController");

// ------------------------
// OccasionCategory Routes
// ------------------------

// Create OccasionCategory (Admin only)
router.post(
  "/",
  isAuthenticated,
  isSuperOrCommunityAdmin,
  occasionCategoryController.createCategory
);

// Get all OccasionCategories (All authenticated users)
router.get(
  "/",
  isAuthenticated,
  queryParser({
    allowFilterFields: ["name", "community"],
    allowSortFields: ["name", "createdAt"],
    maxLimit: 100,
  }),
  occasionCategoryController.getAllCategories
);

// Get single OccasionCategory (All authenticated users)
router.get(
  "/:id",
  isAuthenticated,
  occasionCategoryController.getCategory
);

// Update OccasionCategory (Admin only)
router.put(
  "/:id",
  isAuthenticated,
  isSuperOrCommunityAdmin,
  occasionCategoryController.updateCategory
);

// Delete OccasionCategory (Admin only)
router.delete(
  "/:id",
  isAuthenticated,
  isSuperOrCommunityAdmin,
  occasionCategoryController.deleteCategory
);

module.exports = router;
