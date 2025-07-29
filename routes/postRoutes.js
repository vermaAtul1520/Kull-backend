const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const isAuthenticated = require("../middleware/isAuthenticated");

// Public route to get all posts (optional filter)
router.get("/", isAuthenticated,postController.getAllPosts);

// Protected routes
router.post("/", isAuthenticated, postController.createPost);
router.put("/:id", isAuthenticated, postController.updatePost);
router.delete("/:id", isAuthenticated, postController.deletePost);

module.exports = router;
