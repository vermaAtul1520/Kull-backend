const {Community} = require("../models/Community");
const Post = require("../models/Post");
const User = require("../models/User");
const Like = require('../models/Like');
const Comment = require('../models/Comment');



// @desc    Create a new post for a specific community
// @route   POST /api/posts/community/:communityId
// @access  Authenticated users
exports.createPost = async (req, res) => {
  try {
    const { title, content, imageUrl } = req.body;
    const { communityId } = req.params;
    const { role, roleInCommunity, community } = req.user;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "title and content are required fields.",
      });
    }

    // Check if community exists
    const existingCommunity = await Community.findById(communityId);
    if (!existingCommunity) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "The provided community does not exist.",
      });
    }

    // Authorization: Users can only post to their own community
    if (roleInCommunity === 'admin' && community !== communityId) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only create posts for your own community.",
      });
    }

    // Create Post
    const post = await Post.create({
      title,
      content,
      imageUrl,
      author: req.user.id,
      community: communityId,
    });

    return res.status(201).json({ 
      success: true, 
      statusCode: 201,
      message: "Post created successfully",
      data: post 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      statusCode: 500,
      message: "Error creating post",
      error: error.message 
    });
  }
};

// @desc    Get posts by community ID
// @route   GET /api/posts/community/:communityId
// @access  Authenticated users
exports.getPostsByCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { role, roleInCommunity, community } = req.user;

    // Authorization: Community members can only view their community's posts
    if (roleInCommunity === 'admin' && community !== communityId) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only view posts from your own community",
      });
    }

    const posts = await Post.find({ community: communityId, isActive: true })
      .populate("author", "firstName lastName roleInCommunity")
      .populate("community", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ 
      success: true, 
      statusCode: 200,
      data: posts 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      statusCode: 500,
      message: "Error fetching posts",
      error: error.message 
    });
  }
};

// @desc    Get single post by ID
// @route   GET /api/posts/:id
// @access  Authenticated users
exports.getSinglePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, roleInCommunity, community } = req.user;

    const post = await Post.findById(id)
      .populate("author", "firstName lastName roleInCommunity")
      .populate("community", "name");

    if (!post) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Post not found"
      });
    }

    // Authorization: Users can only view posts from their community
    if (roleInCommunity === 'admin' && post.community._id.toString() !== community) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only view posts from your own community"
      });
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: post
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error fetching post",
      error: error.message
    });
  }
};

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Author, Community Admin, or Super Admin
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ 
        success: false, 
        statusCode: 404,
        message: "Post not found" 
      });
    }

    // Authorization
    const isAuthor = req.user.id === post.author.toString();
    const isSuperAdmin = req.user.role === "superadmin";
    const isCommunityAdmin = req.user.community?.toString() === post.community.toString() && req.user.roleInCommunity === "admin";

    if (!isAuthor && !isSuperAdmin && !isCommunityAdmin) {
      return res.status(403).json({ 
        success: false, 
        statusCode: 403,
        message: "Not authorized to update this post" 
      });
    }

    const updatedFields = req.body;
    Object.assign(post, updatedFields);

    await post.save();

    return res.status(200).json({ 
      success: true, 
      statusCode: 200,
      message: "Post updated successfully",
      data: post 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      statusCode: 500,
      message: "Error updating post",
      error: error.message 
    });
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Author, Community Admin (of the same community), or Super Admin
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Post not found",
      });
    }

    const isAuthor = req.user.id === post.author.toString();
    const isSuperAdmin = req.user.role === "superadmin";
    const isCommunityAdmin =
      req.user.roleInCommunity === "admin" &&
      req.user.community?.toString() === post.community.toString();

    // Authorization check
    if (!isAuthor && !isSuperAdmin && !isCommunityAdmin) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "Not authorized to delete this post",
      });
    }

    // Delete post
    await post.deleteOne();

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Post deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error deleting post",
      error: error.message,
    });
  }
};

// Toggle like/unlike
exports.toggleLike = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.postId;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // Check if already liked
    const existingLike = await Like.findOne({ post: postId, user: userId });

    if (existingLike) {
      await Like.deleteOne({ _id: existingLike._id });
      return res.status(200).json({ message: 'Post unliked' });
    } else {
      await Like.create({ post: postId, user: userId });
      return res.status(201).json({ message: 'Post liked' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Get total likes & users for a post
exports.getPostLikes = async (req, res) => {
  try {
    const postId = req.params.postId;
    const likes = await Like.find({ post: postId }).populate('user', 'firstName lastName _id');
    res.json({
      count: likes.length,
      users: likes.map(like => like.user)
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};



// Create a new comment or reply
exports.createComment = async (req, res) => {
  try {
    const { content, parentComment } = req.body;
    const { postId } = req.params;
    const authorId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await Comment.create({
      content,
      post: postId,
      author: authorId,
      parentComment: parentComment || null
    });

    res.status(201).json({ message: 'Comment created', comment });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Get all comments for a post with nested replies
exports.getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    const topLevelComments = await Comment.find({
      post: postId,
      parentComment: null,
      isDeleted: false
    })
      .populate('author', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    const repliesMap = {};
    const allReplies = await Comment.find({
      post: postId,
      parentComment: { $ne: null },
      isDeleted: false
    })
      .populate('author', 'firstName lastName')
      .lean();

    allReplies.forEach(reply => {
      const parentId = reply.parentComment.toString();
      if (!repliesMap[parentId]) repliesMap[parentId] = [];
      repliesMap[parentId].push(reply);
    });

    const withReplies = topLevelComments.map(comment => ({
      ...comment,
      replies: repliesMap[comment._id.toString()] || []
    }));

    res.json({ count: withReplies.length, comments: withReplies });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Soft delete comment
exports.deleteComment = async (req, res) => {
  try {
    const commentId = req.params.commentId;
    const comment = await Comment.findByIdAndUpdate(
      commentId,
      { isDeleted: true },
      { new: true }
    );
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    res.json({ message: 'Comment deleted', comment });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};
