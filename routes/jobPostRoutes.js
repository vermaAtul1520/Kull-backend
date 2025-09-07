const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleware/isAuthenticated");
const isSuperOrCommunityAdmin = require("../middleware/isSuperOrCommunityAdmin");
const { queryParser } = require("../middleware/queryParser");
const jobPostController = require("../controllers/jobPostController");

// Create JobPost
router.post("/", isAuthenticated, isSuperOrCommunityAdmin, jobPostController.createJobPost);

// List all with queryParser
router.get(
  "/",
  isAuthenticated,
  queryParser({
    allowFilterFields: [
      "title",
      "company",
      "location",
      "category",
      "fileType",
      "community",
      "createdBy",
      "createdAt",
    ],
    allowSortFields: ["title", "company", "category", "createdAt"],
    maxLimit: 50,
  }),
  jobPostController.getAllJobPosts
);

// Get single JobPost
router.get("/:id", isAuthenticated, isSuperOrCommunityAdmin, jobPostController.getJobPost);

// Update JobPost
router.put("/:id", isAuthenticated, isSuperOrCommunityAdmin, jobPostController.updateJobPost);

// Delete JobPost
router.delete("/:id", isAuthenticated, isSuperOrCommunityAdmin, jobPostController.deleteJobPost);

module.exports = router;
