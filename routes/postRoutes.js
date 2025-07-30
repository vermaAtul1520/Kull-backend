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

// Toggle like/unlike
router.post('/likes/:postId', isAuthenticated, postController.toggleLike)
// Get likes for a post
router.get('/likes/:postId', postController.getPostLikes);

// Comments
router.post('/comments/:postId', isAuthenticated, postController.createComment);
router.get('/comments/:postId', postController.getComments);
router.delete('/comments/:commentId', isAuthenticated, postController.deleteComment);

module.exports = router;
