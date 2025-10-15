const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const isAuthenticated = require("../middleware/isAuthenticated");

// Get posts by community ID
router.get("/community/:communityId", isAuthenticated, postController.getPostsByCommunity);

// Create post for a specific community
router.post("/community/:communityId", isAuthenticated, postController.createPost);

// Get single post by ID
router.get("/:id", isAuthenticated, postController.getSinglePost);

// Update post
router.put("/:id", isAuthenticated, postController.updatePost);

// Delete post
router.delete("/:id", isAuthenticated, postController.deletePost);

// likes
router.post('/likes/:postId', isAuthenticated, postController.toggleLike)
router.get('/likes/:postId', postController.getPostLikes);

// Comments
router.post('/comments/:postId', isAuthenticated, postController.createComment);
router.get('/comments/:postId', postController.getComments);
router.delete('/comments/:commentId', isAuthenticated, postController.deleteComment);

module.exports = router;
