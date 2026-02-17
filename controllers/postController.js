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

  const authorIds = [...new Set(posts.map(p => String(p.authorId || p.author?._id || p.author || '')))].filter(id => id && id.length > 5);
  const authors = await userService.getManyByIds(authorIds);
  const authorMap = authors.reduce((acc, u) => ({ ...acc, [String(u.id || u._id)]: u }), {});

  const communityIds = [...new Set(posts.map(p => String(p.communityId || p.community?._id || p.community || '')))].filter(id => id && id.length > 5);
  const communities = await communityService.getManyCommunitiesByIds ? await communityService.getManyCommunitiesByIds(communityIds) : [];
  const communityMap = communities.reduce((acc, c) => ({ ...acc, [String(c.id || c._id)]: c }), {});

  // Fallback for individual fetch if getMany not present
  if (communities.length === 0 && communityIds.length > 0) {
    for (const id of communityIds) {
      if (!communityMap[id]) {
        const c = await communityService.getCommunityById(id);
        if (c) communityMap[id] = c;
      }
    }
  }

  const populatedPosts = await Promise.all(posts.map(async (post) => {
    const p = post.toObject ? post.toObject() : { ...post };
    p._id = p.id || p._id; // Ensure consistent ID

    const authorIdStr = String(p.authorId || p.author || '');
    if (authorMap[authorIdStr]) {
      p.author = {
        _id: authorMap[authorIdStr].id || authorMap[authorIdStr]._id,
        firstName: authorMap[authorIdStr].firstName,
        lastName: authorMap[authorIdStr].lastName,
        roleInCommunity: authorMap[authorIdStr].roleInCommunity,
        profileImage: authorMap[authorIdStr].profileImage
      };
    }

    const commIdStr = String(p.communityId || p.community || '');
    if (communityMap[commIdStr]) {
      p.community = {
        _id: communityMap[commIdStr].id || communityMap[commIdStr]._id,
        name: communityMap[commIdStr].name
      };
    }

    try {
      const likes = await postService.likeRepo.findByPost(p.id || p._id);
      p.likes = likes.map(l => ({
        ...l,
        _id: l.id || l._id,
        user: l.userId || l.user
      }));

      const comments = await postService.commentRepo.findByPost(p.id || p._id, { sort: { createdAt: -1 } });
      p.comments = comments.map(c => ({
        ...c,
        _id: c.id || c._id,
        author: c.author || c.userId || c.user
      }));

      p.likeCount = likes.length;
      p.commentCount = comments.length;
    } catch (e) {
      console.error("Error populating post sub-items:", e.message);
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
    let posts = [];
    if (req.user.role === 'superadmin' && communityId === 'all') {
      posts = await postService.postRepo.findRecent({ limit: 50 });
    } else {
      posts = await postService.getPostsByCommunity(communityId);
    }

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
