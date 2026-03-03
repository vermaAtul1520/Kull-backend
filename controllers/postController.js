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

  // Step 1: Preliminary data extraction
  const postDataArray = await Promise.all(posts.map(async (post) => {
    const p = post.toObject ? post.toObject() : { ...post };
    p._id = p.id || p._id;

    try {
      p.likes = await postService.likeRepo.findByPost(p.id || p._id);
      p.comments = await postService.commentRepo.findByPost(p.id || p._id, { sort: { createdAt: -1 } });
    } catch (e) {
      console.error("Error fetching likes/comments for post:", p._id, e.message);
      p.likes = [];
      p.comments = [];
    }
    return p;
  }));

  // Step 2: Collect all unique IDs (Post authors, Like authors, Comment authors)
  const userIds = new Set();
  const communityIds = new Set();

  postDataArray.forEach(p => {
    // Post author
    const postAuthorId = p.authorId || p.author?._id || p.author;
    if (postAuthorId) userIds.add(String(typeof postAuthorId === 'object' ? (postAuthorId._id || postAuthorId.id) : postAuthorId));

    // Post community
    const commId = p.communityId || p.community?._id || (typeof p.community === 'object' ? p.community?.id : p.community);
    if (commId) communityIds.add(String(typeof commId === 'object' ? (commId._id || commId.id) : commId));

    // Like authors
    p.likes.forEach(l => {
      const lid = l.userId || l.user?._id || l.user;
      if (lid) userIds.add(String(typeof lid === 'object' ? (lid._id || lid.id) : lid));
    });

    // Comment authors
    p.comments.forEach(c => {
      const cid = c.userId || c.user?._id || c.user || c.author;
      if (cid) userIds.add(String(typeof cid === 'object' ? (cid._id || cid.id) : cid));
    });
  });

  // Step 3: Fetch all required users and communities in batches
  const validUserIds = Array.from(userIds).filter(id => id && id.length > 5);
  const validCommIds = Array.from(communityIds).filter(id => id && id.length > 5);

  const [users, communities] = await Promise.all([
    userService.getManyByIds(validUserIds),
    communityService.getManyCommunitiesByIds ? await communityService.getManyCommunitiesByIds(validCommIds) : []
  ]);

  const userMap = users.reduce((acc, u) => ({ ...acc, [String(u.id || u._id)]: u }), {});
  const communityMap = communities.reduce((acc, c) => ({ ...acc, [String(c.id || c._id)]: c }), {});

  // Fallback for community service if getMany not present (common in earlier versions)
  if (communities.length === 0 && validCommIds.length > 0) {
    for (const id of validCommIds) {
      if (!communityMap[id]) {
        const c = await communityService.getCommunityById(id);
        if (c) communityMap[id] = c;
      }
    }
  }

  // Step 4: Final population
  return postDataArray.map(p => {
    // Post Author
    const pAid = String(p.authorId || (typeof p.author === 'object' && p.author ? (p.author._id || p.author.id) : p.author) || '');
    if (userMap[pAid]) {
      p.author = {
        _id: userMap[pAid].id || userMap[pAid]._id,
        firstName: userMap[pAid].firstName,
        lastName: userMap[pAid].lastName,
        roleInCommunity: userMap[pAid].roleInCommunity,
        profileImage: userMap[pAid].profileImage
      };
    }

    // Community
    const pCid = String(p.communityId || (typeof p.community === 'object' && p.community ? (p.community._id || p.community.id) : p.community) || '');
    if (communityMap[pCid]) {
      p.community = {
        _id: communityMap[pCid].id || communityMap[pCid]._id,
        name: communityMap[pCid].name
      };
    }

    // Likes
    p.likes = p.likes.map(l => {
      const lid = String(l.userId || (typeof l.user === 'object' && l.user ? (l.user._id || l.user.id) : l.user) || '');
      const u = userMap[lid];
      return {
        ...l,
        _id: l.id || l._id,
        user: u ? { _id: u.id || u._id, firstName: u.firstName, lastName: u.lastName } : lid
      };
    });

    // Comments
    p.comments = p.comments.map(c => {
      const cid = String(c.userId || (typeof c.user === 'object' && c.user ? (c.user._id || c.user.id) : (c.user || c.author)) || '');
      const u = userMap[cid];
      return {
        ...c,
        _id: c.id || c._id,
        author: u ? { _id: u.id || u._id, firstName: u.firstName, lastName: u.lastName } : cid
      };
    });

    p.likeCount = p.likes.length;
    p.commentCount = p.comments.length;

    return p;
  });
};


exports.createPost = async (req, res) => {
  try {
    const { title, content, imageUrl, media } = req.body;
    const { communityId } = req.params;
    const { role, community } = req.user;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "title and content are required fields.",
      });
    }

    // Validate media array if provided
    if (media && !Array.isArray(media)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "media must be an array of objects.",
      });
    }

    if (media && media.length > 10) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Maximum 10 media items allowed per post.",
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

    // Backwards compatibility: Wrap existing imageUrl into the new media array if standalone imageUrl is sent
    let finalMedia = media || [];
    if (!media || media.length === 0) {
      if (imageUrl) {
        // Simple logic to attempt to infer video vs image from extension
        const isVideo = imageUrl.toLowerCase().match(/\.(mp4|mov|avi|wmv|flv|webm)$/);
        finalMedia = [{ url: imageUrl, mediaType: isVideo ? 'video' : 'image' }];
      }
    }

    const post = await postService.createPost({
      title,
      content,
      imageUrl: finalMedia.length > 0 ? finalMedia[0].url : null, // Store first URL as primary imageUrl for backward compatibility with older DB queries
      media: finalMedia,
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Fetch posts
    let posts = [];
    let total = 0;
    const targetCommunityId = communityId === 'all' ? userCommId : communityId;

    if (targetCommunityId) {
      posts = await postService.getPostsByCommunity(targetCommunityId, { limit, skip });
      total = await postService.postRepo.countByCommunity(targetCommunityId, { isActive: true });
    } else {
      // If no community can be determined even for superadmin, return empty list
      posts = [];
      total = 0;
    }

    // Sync logic removed/deprecated as we now rely on query-time population

    // Populate
    const populatedPosts = await populatePosts(posts);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      total,
      page,
      limit,
      count: populatedPosts.length,
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

    const updated = await postService.updatePost(id, req.body, req.user.id, (isSuperAdmin || isCommunityAdmin));

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Post updated successfully",
      data: updated
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        statusCode: error.status,
        message: "Error updating post",
        error: error.message
      });
    }
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

    await postService.deletePost(id, req.user.id, (isSuperAdmin || isCommunityAdmin));

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Post deleted successfully",
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        statusCode: error.status,
        message: "Error deleting post",
        error: error.message,
      });
    }
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

    let isCommunityAdmin = false;
    if (req.user.roleInCommunity === 'admin') {
      const postId = comment.post || comment.postId;
      const post = await postService.postRepo.findById(postId);
      if (post) {
        const postCommId = String(post.communityId || post.community);
        const userCommId = String(req.user.community._id || req.user.community.id || req.user.community);
        if (postCommId === userCommId) {
          isCommunityAdmin = true;
        }
      }
    }

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
