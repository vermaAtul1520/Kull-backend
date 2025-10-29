const {Community} = require("../models/Community");
const Post = require("../models/Post");
const User = require("../models/User");
const Like = require('../models/Like');
const Comment = require('../models/Comment');

// Utility function to sync existing likes and comments with posts
const syncPostLikesAndComments = async (postId) => {
  try {
    // Get all likes for this post
    const likes = await Like.find({ post: postId });
    const likeIds = likes.map(like => like._id);

    // Get all comments for this post
    const comments = await Comment.find({ post: postId });
    const commentIds = comments.map(comment => comment._id);

    // Update the post with the correct like and comment arrays
    await Post.findByIdAndUpdate(postId, {
      likes: likeIds,
      comments: commentIds
    });

    console.log(`Synced post ${postId}: ${likeIds.length} likes, ${commentIds.length} comments`);
  } catch (error) {
    console.error(`Error syncing post ${postId}:`, error);
  }
};



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

    // Authorization: Non-superadmin users can only post to their own community
    if (role !== 'superadmin' && community.toString() !== communityId) {
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

    // Authorization: Non-superadmin users can only view their community's posts
    if (role !== 'superadmin' && community.toString() !== communityId) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only view posts from your own community",
      });
    }

    // First, sync all posts to ensure likes and comments arrays are up to date
    const allPosts = await Post.find({ community: communityId, isActive: true });
    await Promise.all(allPosts.map(post => syncPostLikesAndComments(post._id)));

    const posts = await Post.find({ community: communityId, isActive: true })
      .populate("author", "firstName lastName roleInCommunity")
      .populate("community", "name")
      .populate({
        path: "likes",
        populate: {
          path: "user",
          select: "firstName lastName _id"
        }
      })
      .populate({
        path: "comments",
        populate: {
          path: "author",
          select: "firstName lastName _id"
        },
        match: { isDeleted: false },
        options: { sort: { createdAt: -1 } }
      })
      .sort({ createdAt: -1 });

    // Debug: Add like and comment counts for each post
    const postsWithCounts = await Promise.all(posts.map(async (post) => {
      const likeCount = await Like.countDocuments({ post: post._id });
      const commentCount = await Comment.countDocuments({ post: post._id, isDeleted: false });

      return {
        ...post.toObject(),
        debug: {
          likesInArray: post.likes.length,
          actualLikeCount: likeCount,
          commentsInArray: post.comments.length,
          actualCommentCount: commentCount
        }
      };
    }));

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: postsWithCounts
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
      .populate("community", "name")
      .populate({
        path: "likes",
        populate: {
          path: "user",
          select: "firstName lastName _id"
        }
      })
      .populate({
        path: "comments",
        populate: {
          path: "author",
          select: "firstName lastName _id"
        },
        match: { isDeleted: false },
        options: { sort: { createdAt: -1 } }
      });

    if (!post) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Post not found"
      });
    }

    // Authorization: Non-superadmin users can only view posts from their community
    if (role !== 'superadmin' && post.community._id.toString() !== community.toString()) {
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
    if (!post) return res.status(404).json({
      success: false,
      message: 'Post not found'
    });

    // Check if already liked
    const existingLike = await Like.findOne({ post: postId, user: userId });

    if (existingLike) {
      // Unlike: Remove like and update post
      await Like.deleteOne({ _id: existingLike._id });
      await Post.findByIdAndUpdate(postId, {
        $pull: { likes: existingLike._id }
      });
      return res.status(200).json({
        success: true,
        message: 'Post unliked',
        action: 'unliked'
      });
    } else {
      // Like: Create like and update post
      const newLike = await Like.create({ post: postId, user: userId });
      await Post.findByIdAndUpdate(postId, {
        $push: { likes: newLike._id }
      });
      return res.status(201).json({
        success: true,
        message: 'Post liked',
        action: 'liked'
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message
    });
  }
};

// Get total likes & users for a post
exports.getPostLikes = async (req, res) => {
  try {
    const postId = req.params.postId;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const likes = await Like.find({ post: postId }).populate('user', 'firstName lastName _id');

    res.json({
      success: true,
      data: {
        count: likes.length,
        users: likes.map(like => like.user),
        isLikedByCurrentUser: likes.some(like => like.user._id.toString() === req.user.id)
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message
    });
  }
};



// Create a new comment or reply
exports.createComment = async (req, res) => {
  try {
    const { content, parentComment } = req.body;
    const { postId } = req.params;
    const authorId = req.user.id;

    // Validate required fields
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({
      success: false,
      message: 'Post not found'
    });

    const comment = await Comment.create({
      content: content.trim(),
      post: postId,
      author: authorId,
      parentComment: parentComment || null
    });

    // Add comment to post's comments array (only for top-level comments)
    if (!parentComment) {
      await Post.findByIdAndUpdate(postId, {
        $push: { comments: comment._id }
      });
    }

    // Populate the comment with author details before returning
    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'firstName lastName _id');

    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      data: populatedComment
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message
    });
  }
};

// Get all comments for a post with nested replies
exports.getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const topLevelComments = await Comment.find({
      post: postId,
      parentComment: null,
      isDeleted: false
    })
      .populate('author', 'firstName lastName _id')
      .sort({ createdAt: -1 })
      .lean();

    const repliesMap = {};
    const allReplies = await Comment.find({
      post: postId,
      parentComment: { $ne: null },
      isDeleted: false
    })
      .populate('author', 'firstName lastName _id')
      .sort({ createdAt: 1 }) // Replies in chronological order
      .lean();

    allReplies.forEach(reply => {
      const parentId = reply.parentComment.toString();
      if (!repliesMap[parentId]) repliesMap[parentId] = [];
      repliesMap[parentId].push(reply);
    });

    const withReplies = topLevelComments.map(comment => ({
      ...comment,
      replies: repliesMap[comment._id.toString()] || [],
      replyCount: (repliesMap[comment._id.toString()] || []).length
    }));

    res.json({
      success: true,
      data: {
        count: withReplies.length,
        comments: withReplies,
        totalComments: topLevelComments.length + allReplies.length
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message
    });
  }
};

// Soft delete comment
exports.deleteComment = async (req, res) => {
  try {
    const commentId = req.params.commentId;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({
      success: false,
      message: 'Comment not found'
    });

    // Check if user is authorized to delete (author, community admin, or superadmin)
    const isAuthor = comment.author.toString() === userId;
    const isSuperAdmin = req.user.role === 'superadmin';
    const isCommunityAdmin = req.user.roleInCommunity === 'admin';

    if (!isAuthor && !isSuperAdmin && !isCommunityAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    // Soft delete the comment
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { isDeleted: true },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Comment deleted successfully',
      data: updatedComment
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message
    });
  }
};

// One-time sync function to fix existing data
exports.syncAllPostsLikesComments = async (req, res) => {
  try {
    // Only allow superadmin to run this
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmin can run this sync operation'
      });
    }

    const allPosts = await Post.find({});
    let syncedCount = 0;
    let totalLikes = 0;
    let totalComments = 0;

    for (const post of allPosts) {
      // Get all likes for this post
      const likes = await Like.find({ post: post._id });
      const likeIds = likes.map(like => like._id);

      // Get all comments for this post
      const comments = await Comment.find({ post: post._id });
      const commentIds = comments.map(comment => comment._id);

      // Update the post with the correct like and comment arrays
      await Post.findByIdAndUpdate(post._id, {
        likes: likeIds,
        comments: commentIds
      });

      syncedCount++;
      totalLikes += likeIds.length;
      totalComments += commentIds.length;

      console.log(`Synced post ${post._id}: ${likeIds.length} likes, ${commentIds.length} comments`);
    }

    return res.status(200).json({
      success: true,
      message: 'All posts synced successfully',
      data: {
        postsProcessed: syncedCount,
        totalLikes,
        totalComments
      }
    });
  } catch (error) {
    console.error('Error syncing posts:', error);
    return res.status(500).json({
      success: false,
      message: 'Error syncing posts',
      error: error.message
    });
  }
};
