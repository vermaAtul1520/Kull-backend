const Community = require("../models/Community");
const Post = require("../models/Post");
const User = require("../models/User");

// @desc    Create a new post
// @route   POST /api/posts
// @access  Community Admin or Super Admin
exports.createPost = async (req, res) => {
  try {
    const { title, content, imageUrl, community } = req.body;

    // Step 1: Validate required fields manually (Mongoose just throws ugly error)
    if (!title || !content || !community) {
      return res.status(400).json({
        success: false,
        message: "title, content, and community are required fields.",
      });
    }

    // Step 2: Check if community exists
    const existingCommunity = await Community.findById(community);
    if (!existingCommunity) {
      return res.status(400).json({
        success: false,
        message: "The provided community does not exist.",
      });
    }

    // Step 3: Authorization - Only community admin or superadmin can post
    const isSuperAdmin = req.user.role === "superadmin";
    const isCommunityAdmin =
      req.user.roleInCommunity === "admin" &&
      req.user.community?.toString() === community;

    if (!isSuperAdmin && !isCommunityAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to create a post for this community.",
      });
    }

    // Step 4: Create Post
    const post = await Post.create({
      title,
      content,
      imageUrl,
      author: req.user.id,
      community,
    });

    return res.status(201).json({ success: true, data: post });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: error.message });
  }
};

// @desc    Get all posts (optionally filter by community)
// @route   GET /api/posts?community=communityId
// @access  Public (but filtered based on user's role and community)
exports.getAllPosts = async (req, res) => {
  try {
    const { community } = req.query;

    // Default filter
    const filter = { isActive: true };

    // If superadmin
    if (req.user.role === "superadmin") {
      if (community) {
        // Superadmin passed community param, filter by that community
        filter.community = community;
      }
      // else: superadmin sees all posts (no additional filter)
    } else {
      // Non-superadmin: only see posts from their own community
      if (!req.user.community) {
        return res.status(403).json({
          success: false,
          message: "Community access is required",
        });
      }

      // Only allow access to posts from their own community
      filter.community = req.user.community.toString();
    }

    const posts = await Post.find(filter)
      .populate("author", "firstName lastName roleInCommunity")
      .populate("community", "name");

    res.status(200).json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Author, Community Admin, or Super Admin
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    // Authorization
    if (
      req.user.id !== post.author.toString() &&
      req.user.role !== "superadmin" &&
      !(req.user.community?.toString() === post.community.toString() && req.user.roleInCommunity === "admin")
    ) {
      return res.status(403).json({ success: false, message: "Not authorized to update this post" });
    }

    const updatedFields = req.body;
    Object.assign(post, updatedFields);

    await post.save();

    res.status(200).json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Author, Community Admin (of the same community), or Super Admin
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    // Post not found
    if (!post) {
      return res.status(404).json({
        success: false,
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
        message: "Not authorized to delete this post",
      });
    }

    // Delete post
    await post.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};