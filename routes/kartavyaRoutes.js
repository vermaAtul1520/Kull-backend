const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleware/isAuthenticated");
const isSuperOrCommunityAdmin = require("../middleware/isSuperOrCommunityAdmin");
const { queryParser } = require("../middleware/queryParser");
const kartavyaController = require("../controllers/kartavyaController");

// Create Kartavya
router.post("/", isAuthenticated, isSuperOrCommunityAdmin, kartavyaController.createKartavya);

// List all Kartavyas
router.get(
  "/",
  isAuthenticated,
  queryParser({
    allowFilterFields: [
      "title",
      "category",
      "filetype",
      "language",
      "community",
      "createdBy",
      "createdAt",
    ],
    allowSortFields: ["title", "category", "createdAt"],
    maxLimit: 50,
  }),
  kartavyaController.getAllKartavyas
);

// Get single Kartavya 
router.get("/:id", isAuthenticated, isSuperOrCommunityAdmin, kartavyaController.getKartavya);

// Update Kartavya
router.put("/:id", isAuthenticated, isSuperOrCommunityAdmin, kartavyaController.updateKartavya);

// Delete Kartavya
router.delete("/:id", isAuthenticated, isSuperOrCommunityAdmin, kartavyaController.deleteKartavya);

module.exports = router;
