const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const isAuthenticated = require("../middleware/isAuthenticated");

// posts
router.get("/", isAuthenticated,postController.getAllPosts);
router.post("/", isAuthenticated, postController.createPost);
router.put("/:id", isAuthenticated, postController.updatePost);
router.delete("/:id", isAuthenticated, postController.deletePost);

// likes
router.post('/likes/:postId', isAuthenticated, postController.toggleLike)
router.get('/likes/:postId', postController.getPostLikes);

// Comments
router.post('/comments/:postId', isAuthenticated, postController.createComment);
router.get('/comments/:postId', postController.getComments);
router.delete('/comments/:commentId', isAuthenticated, postController.deleteComment);

module.exports = router;
