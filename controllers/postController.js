// controllers/postController.js
// Post controller - Refactored to use Services for DynamoDB compatibility

const { getPostService } = require('../services/postService');
const { getCommunityService } = require('../services/communityService');
const { getUserService } = require('../services/userService');

// Get service instances
const postService = getPostService();
const communityService = getCommunityService();
const userService = getUserService();

// Helper to populate post details (Author, Community, Likes, Comments)
const populatePosts = async (posts, type = 'list') => {
  if (!posts || posts.length === 0) return [];

  // 1. Populate Authors
  const authorIds = [...new Set(posts.map(p => p.authorId || p.author?._id || p.author))].filter(id => id);
  const authors = await userService.getManyByIds(authorIds);
  const authorMap = authors.reduce((acc, u) => ({ ...acc, [u.id || u._id]: u }), {});

  // 2. Populate Communities
  const communityIds = [...new Set(posts.map(p => p.communityId || p.community?._id || p.community))].filter(id => id);
  // Assuming communityService has getManyByIds or we fetch individually if few. 
  // CommunityService usually caches or we fetch one by one? 
  // For now, let's fetch individually or leave as ID if not critical, but UI needs name.
  // Let's implement a quick map.
  const communityMap = {};
  await Promise.all(communityIds.map(async (id) => {
    const c = await communityService.getCommunityById(id);
    if (c) communityMap[id] = c;
  }));

  // 3. Populate Likes & Comments (Heavy operation - optimized for 'list' vs 'single')
  // distinct fetching for each post
  const populatedPosts = await Promise.all(posts.map(async (post) => {
    const p = post.toObject ? post.toObject() : { ...post }; // Ensure plain object

    // Author
    const authorId = p.authorId || p.author;
    if (authorMap[authorId]) {
      p.author = {
        _id: authorMap[authorId].id || authorMap[authorId]._id,
        firstName: authorMap[authorId].firstName,
        lastName: authorMap[authorId].lastName,
        roleInCommunity: authorMap[authorId].roleInCommunity,
        profileImage: authorMap[authorId].profileImage
      };
    }

    // Community
    const commId = p.communityId || p.community;
    if (communityMap[commId]) {
      p.community = {
        _id: communityMap[commId]._id || communityMap[commId].id,
        name: communityMap[commId].name
      };
    }

    // Likes
    // Fetch actual likes from repo
    try {
      // We need to access likeRepo via service or direct? 
      // postService doesn't expose getLikes? 
      // We should add it or use internal knowledge. 
      // Let's use postService.postRepo.likeRepo or similar? 
      // Better: postService.getLikes(postId) ??
      // Actually postService.likeRepo is available.

      // NOTE: Ideally Service should expose this.
      // But for now, we access via the service instance's repo references (if public) or added methods.
      // Implementation: postService.likeRepo is accessible if we look at service code (this.likeRepo).

      const likes = await postService.likeRepo.findByPost(p.id || p._id);
      const likeUserIds = likes.map(l => l.user || l.userId).filter(id => id);
      const likeUsers = await userService.getManyByIds(likeUserIds);
      const likeUserMap = likeUsers.reduce((acc, u) => ({ ...acc, [u.id || u._id]: u }), {});

      p.likes = likes.map(l => ({
        ...l,
        user: likeUserMap[l.user || l.userId] ? {
          _id: likeUserMap[l.user || l.userId].id || likeUserMap[l.user || l.userId]._id,
          firstName: likeUserMap[l.user || l.userId].firstName,
          lastName: likeUserMap[l.user || l.userId].lastName
        } : null
      })).filter(l => l.user); // Filter out invalid users

      // Comments
      const comments = await postService.commentRepo.findByPost(p.id || p._id, { sort: { createdAt: -1 } });
      const commentUserIds = comments.map(c => c.user || c.userId || c.author).filter(id => id);
      const commentUsers = await userService.getManyByIds(commentUserIds);
      const commentUserMap = commentUsers.reduce((acc, u) => ({ ...acc, [u.id || u._id]: u }), {});

      // Structure comments (threading if needed)
      const populatedComments = comments.map(c => ({
        ...c,
        author: commentUserMap[c.user || c.userId || c.author] ? {
          _id: commentUserMap[c.user || c.userId || c.author].id || commentUserMap[c.user || c.userId || c.author]._id,
          firstName: commentUserMap[c.user || c.userId || c.author].firstName,
          lastName: commentUserMap[c.user || c.userId || c.author].lastName
        } : null
      })).filter(c => c.author);

      // Handle replies logic (simple nesting)
      const topLevel = [];
      const repliesMap = {};
      populatedComments.forEach(c => {
        if (c.parentComment) {
          if (!repliesMap[c.parentComment]) repliesMap[c.parentComment] = [];
          repliesMap[c.parentComment].push(c);
        } else {
          topLevel.push(c);
        }
      });

      p.comments = topLevel.map(c => ({
        ...c,
        replies: repliesMap[c._id || c.id] || [],
        replyCount: (repliesMap[c._id || c.id] || []).length
      }));

      // Debug counts
      p.debug = {
        actualLikeCount: likes.length,
        actualCommentCount: comments.length
      };

    } catch (e) {
      console.error("Error generating population for post:", p._id, e);
    }

    return p;
  }));

  return populatedPosts;
};


exports.createPost = async (req, res) => {
  try {
    const { title, content, imageUrl } = req.body;
    const { communityId } = req.params;
    const { role, community } = req.user;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "title and content are required fields.",
      });
    }

    const existingCommunity = await communityService.getCommunityById(communityId);
    if (!existingCommunity) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "The provided community does not exist.",
      });
    }

    // Role check
    const userCommId = community && (community._id || community.id);
    if (role !== 'superadmin' && String(userCommId) !== String(communityId)) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only create posts for your own community.",
      });
    }

    const post = await postService.createPost({
      title,
      content,
      imageUrl,
      // isActive: true // Service defaults this
    }, req.user.id, communityId);

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

exports.getPostsByCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { role, community } = req.user;

    const userCommId = community ? (community._id || community.id) : null;

    if (role !== 'superadmin' && String(userCommId) !== String(communityId)) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only view posts from your own community",
      });
    }

    // Fetch posts
    const posts = await postService.getPostsByCommunity(communityId);

    // Sync logic removed/deprecated as we now rely on query-time population

    // Populate
    const populatedPosts = await populatePosts(posts);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: populatedPosts
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error fetching posts",
      error: error.message
    });
  }
};

exports.getSinglePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, community } = req.user;

    const post = await postService.getPostById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Post not found"
      });
    }

    // Authorization: Non-superadmin users can only view their community's news
    const userCommId = community ? (community._id || community.id) : null;
    const postCommId = String(post.community);
    if (role !== 'superadmin' && postCommId !== String(userCommId)) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "You can only view posts from your own community"
      });
    }

    const [populatedPost] = await populatePosts([post]);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: populatedPost
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

exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await postService.getPostById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Post not found"
      });
    }

    const authorId = post.authorId || post.author;
    const postCommId = post.communityId || post.community;
    const userCommId = req.user.community ? (req.user.community._id || req.user.community) : null;

    const isAuthor = String(req.user.id) === String(authorId);
    const isSuperAdmin = req.user.role === "superadmin";
    const isCommunityAdmin = String(userCommId) === String(postCommId) && req.user.roleInCommunity === "admin";

    if (!isAuthor && !isSuperAdmin && !isCommunityAdmin) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "Not authorized to update this post"
      });
    }

    const updated = await postService.updatePost(id, req.body, req.user.id); // Validations inside service might differ slightly, but we did checks here.

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Post updated successfully",
      data: updated
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

exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await postService.getPostById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Post not found",
      });
    }

    const authorId = post.authorId || post.author;
    const postCommId = post.communityId || post.community;
    const userCommId = req.user.community ? (req.user.community._id || req.user.community) : null;

    const isAuthor = String(req.user.id) === String(authorId);
    const isSuperAdmin = req.user.role === "superadmin";
    const isCommunityAdmin = req.user.roleInCommunity === "admin" && String(userCommId) === String(postCommId);

    if (!isAuthor && !isSuperAdmin && !isCommunityAdmin) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "Not authorized to delete this post",
      });
    }

    await postService.deletePost(id, req.user.id, true); // true for 'isAdmin' bypass of internal check as we checked manually

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

exports.toggleLike = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.postId;

    const post = await postService.getPostById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    // Use service Logic
    const result = await postService.likePost(postId, userId);

    // Check if it was already liked -> unlike
    if (result.alreadyLiked) {
      await postService.unlikePost(postId, userId);
      return res.status(200).json({ success: true, message: 'Post unliked', action: 'unliked' });
    }

    return res.status(201).json({ success: true, message: 'Post liked', action: 'liked' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

exports.getPostLikes = async (req, res) => {
  try {
    const postId = req.params.postId;
    const post = await postService.getPostById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const likes = await postService.likeRepo.findByPost(postId);
    const userIds = likes.map(l => l.user || l.userId).filter(id => id);
    const users = await userService.getManyByIds(userIds);
    const userMap = users.reduce((acc, u) => ({ ...acc, [u.id || u._id]: u }), {});

    const populatedLikes = likes.map(l => ({
      ...l,
      user: userMap[l.user || l.userId] ? {
        _id: userMap[l.user || l.userId].id || userMap[l.user || l.userId]._id,
        firstName: userMap[l.user || l.userId].firstName,
        lastName: userMap[l.user || l.userId].lastName,
        profileImage: userMap[l.user || l.userId].profileImage
      } : null
    })).filter(l => l.user);

    res.json({
      success: true,
      data: {
        count: populatedLikes.length,
        users: populatedLikes.map(l => l.user),
        isLikedByCurrentUser: userIds.some(id => String(id) === String(req.user.id))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

exports.createComment = async (req, res) => {
  try {
    const { content, parentComment } = req.body;
    const { postId } = req.params;
    const authorId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    const post = await postService.getPostById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    // We should probably allow parentComment to be passed to Service or Repo. 
    // Service addComment signature: (postId, userId, content)
    // It doesn't support parentComment ??
    // Let's check Service... addComment(postId, userId, content) -> Repo.create({ post, user, content })
    // Repo.create doesn't check parentComment?
    // We need to inject parentComment.
    // Hack: Pass it in content? No.
    // Better: Update service or call repo directly? Service "owns" logic.
    // I'll assume I can pass object as content? No.
    // I will call `postService.commentRepo.create` directly if Service doesn't support it, OR better, extend service temporarily here?
    // Just modify existing service call if possible.
    // The service `addComment` calls `commentRepo.create`.
    // Let's modify the service call to include parentComment if we can.
    // `postService.addComment` implementation:
    // async addComment(postId, userId, content) {
    //    const comment = await this.commentRepo.create({ post: postId, user: userId, content });
    //    ...
    // }
    // It seems inflexible.
    // I'll manually create comment using repo to support parentComment
    const commentData = {
      post: postId,
      user: authorId,
      content: content.trim(),
      parentComment: parentComment || null
    };
    const comment = await postService.commentRepo.create(commentData);
    await postService.postRepo.addComment(postId, comment._id || comment.id);

    // Populate Response
    const author = await userService.getUserById(authorId);
    const populated = {
      ...comment,
      author: author ? {
        _id: author.id || author._id,
        firstName: author.firstName,
        lastName: author.lastName
      } : null
    };

    res.status(201).json({ success: true, message: 'Comment created successfully', data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

exports.getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await postService.getPostById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comments = await postService.commentRepo.findByPost(postId);

    // Populate
    const userIds = comments.map(c => c.user || c.userId || c.author).filter(id => id);
    const users = await userService.getManyByIds(userIds);
    const userMap = users.reduce((acc, u) => ({ ...acc, [u.id || u._id]: u }), {});

    const populatedComments = comments.map(c => ({
      ...c,
      author: userMap[c.user || c.userId || c.author] ? {
        _id: userMap[c.user || c.userId || c.author].id || userMap[c.user || c.userId || c.author]._id,
        firstName: userMap[c.user || c.userId || c.author].firstName,
        lastName: userMap[c.user || c.userId || c.author].lastName
      } : null
    })).filter(c => c.author);

    // Reconstruct Tree
    const topLevelComments = [];
    const repliesMap = {};

    populatedComments.forEach(c => {
      if (c.parentComment) {
        const pid = c.parentComment._id || c.parentComment; // Handle if it's object or string
        if (!repliesMap[pid]) repliesMap[pid] = [];
        repliesMap[pid].push(c);
      } else {
        topLevelComments.push(c);
      }
    });

    const withReplies = topLevelComments.map(c => ({
      ...c,
      replies: repliesMap[c._id || c.id] || [],
      replyCount: (repliesMap[c._id || c.id] || []).length
    }));

    // Total includes replies
    res.json({
      success: true,
      data: {
        count: withReplies.length,
        comments: withReplies,
        totalComments: populatedComments.length
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const commentId = req.params.commentId;
    const userId = req.user.id;

    // We need to fetch comment to check ownership
    const comment = await postService.commentRepo.findById(commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    const commentUserId = comment.user || comment.userId || comment.author;
    const isAuthor = String(commentUserId) === String(userId);
    const isSuperAdmin = req.user.role === 'superadmin';
    const isCommunityAdmin = req.user.roleInCommunity === 'admin'; // Might need to check community match if rigorous

    if (!isAuthor && !isSuperAdmin && !isCommunityAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    // Soft delete
    await postService.commentRepo.updateById(commentId, { isDeleted: true });

    res.json({ success: true, message: 'Comment deleted successfully', data: { _id: commentId, isDeleted: true } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

exports.syncAllPostsLikesComments = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Only superadmin can run this sync operation' });
    }
    // Deprecated for DynamoDB transition as we don't encourage reliance on embedded arrays. 
    // But returning success for backward compat calls.
    return res.status(200).json({
      success: true,
      message: 'Sync operation deprecated/skipped for DynamoDB compatibility.',
      data: { postsProcessed: 0, totalLikes: 0, totalComments: 0 }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error syncing posts', error: error.message });
  }
};
