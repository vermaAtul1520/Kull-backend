const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');
const { protect } = require("../middleware/auth");

// GET /api/news - Get all posts
router.get('/', protect, newsController.getAllPosts);

// POST /api/news - Create new post (Admin only)
router.post('/', protect, newsController.createPost);

// PUT /api/news/:postId - Update post
router.put('/:postId', protect, newsController.updatePost);

// DELETE /api/news/:postId - Delete post
router.delete('/:postId', protect, newsController.deletePost);

// POST /api/news/:postId/like - Toggle like/unlike
router.post('/:postId/like', protect, newsController.toggleLikePost);

// POST /api/news/:postId/comments - Add comment
router.post('/:postId/comments', protect, newsController.addComment);

// GET /api/news/:postId/comments - Get post comments
router.get('/:postId/comments', protect, newsController.getPostComments);

module.exports = router;