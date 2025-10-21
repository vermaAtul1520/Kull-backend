// routes/appealRoutes.js
const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleware/isAuthenticated");
const isSuperAdmin = require("../middleware/isSuperAdmin");
const { queryParser } = require("../middleware/queryParser");
const appealController = require("../controllers/appealController");
const isSuperOrCommunityAdmin = require("../middleware/isSuperOrCommunityAdmin");

router.post("/", isAuthenticated, appealController.createAppeal);

// List with queryParser
router.get(
  "/",
  isAuthenticated,
  queryParser({
    allowFilterFields: [
      "subject",
      "category",
      "status",
      "priority",
      "user",
      "community",
      "createdAt",
    ],
    allowSortFields: ["subject", "category", "status", "priority", "createdAt"],
    maxLimit: 50,
  }),
  appealController.getAll
);

// Get single
router.get("/:id", isAuthenticated,isSuperOrCommunityAdmin ,appealController.getAppeal);

// Update
router.put("/:id", isAuthenticated,isSuperOrCommunityAdmin, appealController.updateAppeal);

// Delete (only super admin)
router.delete("/:id", isAuthenticated, isSuperOrCommunityAdmin, appealController.deleteAppeal);

module.exports = router;