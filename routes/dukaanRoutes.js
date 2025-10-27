// routes/dukaanRoutes.js
const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleware/isAuthenticated");
const isSuperOrCommunityAdmin = require("../middleware/isSuperOrCommunityAdmin");
const { queryParser } = require("../middleware/queryParser");
const dukaanController = require("../controllers/dukaanController");

// Create Dukaan
router.post("/", isAuthenticated, isSuperOrCommunityAdmin, dukaanController.createDukaan);

// List all with queryParser
router.get(
  "/",
  isAuthenticated,
  queryParser({
    allowFilterFields: [
      "shopName",
      "ownerName",
      "location",
      "phone",
      "category",
      "community",
      "createdBy",
      "createdAt",
      "isActive",
      "url",
    ],
    allowSortFields: ["shopName", "category", "createdAt"],
    maxLimit: 50,
  }),
  dukaanController.getAllDukaans
);

// Get single Dukaan
router.get("/:id", isAuthenticated, isSuperOrCommunityAdmin, dukaanController.getDukaan);

// Update Dukaan
router.put("/:id", isAuthenticated, isSuperOrCommunityAdmin, dukaanController.updateDukaan);

// Delete Dukaan
router.delete("/:id", isAuthenticated, isSuperOrCommunityAdmin, dukaanController.deleteDukaan);

module.exports = router;
