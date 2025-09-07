// routes/educationResourceRoutes.js
const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleware/isAuthenticated");
const isSuperOrCommunityAdmin = require("../middleware/isSuperOrCommunityAdmin");
const { queryParser } = require("../middleware/queryParser");
const educationResourceController = require("../controllers/educationResourceController");

// Create
router.post(
  "/",
  isAuthenticated,
  isSuperOrCommunityAdmin,
  educationResourceController.createResource
);

// List with queryParser
router.get(
  "/",
  isAuthenticated,
  queryParser({
    allowFilterFields: [
      "title",
      "type",
      "category",
      "instructor",
      "community",
      "createdBy",
      "createdAt",
    ],
    allowSortFields: ["title", "type", "category", "createdAt"],
    maxLimit: 50,
  }),
  educationResourceController.getAllResources
);

// Get single
router.get(
  "/:id",
  isAuthenticated,
  isSuperOrCommunityAdmin,
  educationResourceController.getResource
);

// Update
router.put(
  "/:id",
  isAuthenticated,
  isSuperOrCommunityAdmin,
  educationResourceController.updateResource
);

// Delete
router.delete(
  "/:id",
  isAuthenticated,
  isSuperOrCommunityAdmin,
  educationResourceController.deleteResource
);

module.exports = router;
