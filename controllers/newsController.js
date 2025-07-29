const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { getTimeAgo } = require('../utils/helper');


// GET ALL POSTS
exports.getAllPosts = async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const userId = req.user?._id; // From auth middleware

        const posts = await Post.find({ isActive: true })
            .populate('author', 'name avatar')
            .populate({
                path: 'comments',
                populate: {
                    path: 'author',
                    select: 'name avatar'
                },
                options: {
                    sort: { createdAt: -1 },
                    limit: 3 // Only get recent 3 comments for preview
                }
            })
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        // Format posts for frontend
        const formattedPosts = posts.map(post => ({
            id: post._id,
            title: post.title,
            content: post.content,
            imageUrl: post.imageUrl,
            authorName: post.author.name,
            authorAvatar: post.author.avatar,
            timestamp: getTimeAgo(post.createdAt),
            likes: post.likesCount,
            comments: post.commentsCount,
            isLiked: userId ? post.likes.some(like => like.user.toString() === userId.toString()) : false,
            commentsData: post.comments.map(comment => ({
                id: comment._id,
                author: comment.author.name,
                text: comment.text,
                time: getTimeAgo(comment.createdAt)
            }))
        }));

        const totalPosts = await Post.countDocuments({ isActive: true });
        const totalPages = Math.ceil(totalPosts / limit);

        res.status(200).json({
            success: true,
            data: {
                posts: formattedPosts,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalPosts,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Get all posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch posts',
            error: error.message
        });
    }
};


// CREATE POST
exports.createPost = async (req, res) => {
    try {
        const { title, content, imageUrl } = req.body;
        const userId = req.user._id; // From auth middleware

        // Validation
        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: 'Title and content are required'
            });
        }

        // Check if user is admin (optional - based on your requirements)
        const user = await User.findById(userId);
        if (!user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only admin users can create posts'
            });
        }

        const newPost = new Post({
            title: title.trim(),
            content: content.trim(),
            imageUrl: imageUrl || null,
            author: userId
        });

        await newPost.save();

        // Populate author info for response
        await newPost.populate('author', 'name avatar');

        const formattedPost = {
            id: newPost._id,
            title: newPost.title,
            content: newPost.content,
            imageUrl: newPost.imageUrl,
            authorName: newPost.author.name,
            authorAvatar: newPost.author.avatar,
            timestamp: 'Just now',
            likes: 0,
            comments: 0,
            isLiked: false,
            commentsData: []
        };

        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            data: formattedPost
        });

    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create post',
            error: error.message
        });
    }
};


// UPDATE POST
exports.updatePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { title, content, imageUrl } = req.body;
        const userId = req.user._id;

        const post = await Post.findOne({ _id: postId, isActive: true });
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Check if user is the author or admin
        const user = await User.findById(userId);
        if (post.author.toString() !== userId.toString() && !user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'You can only edit your own posts'
            });
        }

        // Update fields
        if (title) post.title = title.trim();
        if (content) post.content = content.trim();
        if (imageUrl !== undefined) post.imageUrl = imageUrl;

        await post.save();
        await post.populate('author', 'name avatar');

        const formattedPost = {
            id: post._id,
            title: post.title,
            content: post.content,
            imageUrl: post.imageUrl,
            authorName: post.author.name,
            authorAvatar: post.author.avatar,
            timestamp: getTimeAgo(post.updatedAt),
            likes: post.likesCount,
            comments: post.commentsCount,
            isLiked: post.likes.some(like => like.user.toString() === userId.toString())
        };

        res.status(200).json({
            success: true,
            message: 'Post updated successfully',
            data: formattedPost
        });

    } catch (error) {
        console.error('Update post error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update post',
            error: error.message
        });
    }
};


// DELETE POST
exports.deletePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user._id;

        const post = await Post.findOne({ _id: postId, isActive: true });
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Check if user is the author or admin
        const user = await User.findById(userId);
        if (post.author.toString() !== userId.toString() && !user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own posts'
            });
        }

        // Soft delete
        post.isActive = false;
        await post.save();

        // Also soft delete all comments
        await Comment.updateMany(
            { post: postId },
            { isActive: false }
        );

        res.status(200).json({
            success: true,
            message: 'Post deleted successfully'
        });

    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete post',
            error: error.message
        });
    }
};


// LIKE/UNLIKE POST
exports.toggleLikePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user._id;

        const post = await Post.findOne({ _id: postId, isActive: true });
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        const existingLikeIndex = post.likes.findIndex(
            like => like.user.toString() === userId.toString()
        );

        let isLiked;
        if (existingLikeIndex > -1) {
            // Unlike
            post.likes.splice(existingLikeIndex, 1);
            post.likesCount = Math.max(0, post.likesCount - 1);
            isLiked = false;
        } else {
            // Like
            post.likes.push({ user: userId });
            post.likesCount += 1;
            isLiked = true;
        }

        await post.save();

        res.status(200).json({
            success: true,
            data: {
                isLiked,
                likesCount: post.likesCount,
                message: isLiked ? 'Post liked' : 'Post unliked'
            }
        });

    } catch (error) {
        console.error('Toggle like error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle like',
            error: error.message
        });
    }
};


// ADD COMMENT
exports.addComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { text } = req.body;
        const userId = req.user._id;

        if (!text || !text.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Comment text is required'
            });
        }

        const post = await Post.findOne({ _id: postId, isActive: true });
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        const newComment = new Comment({
            text: text.trim(),
            author: userId,
            post: postId
        });

        await newComment.save();
        await newComment.populate('author', 'name avatar');

        // Update post's comments array and count
        post.comments.push(newComment._id);
        post.commentsCount += 1;
        await post.save();

        const formattedComment = {
            id: newComment._id,
            author: newComment.author.name,
            text: newComment.text,
            time: 'Just now'
        };

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            data: {
                comment: formattedComment,
                commentsCount: post.commentsCount
            }
        });

    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add comment',
            error: error.message
        });
    }
};


// GET POST COMMENTS
exports.getPostComments = async (req, res) => {
    try {
        const { postId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const post = await Post.findOne({ _id: postId, isActive: true });
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        const comments = await Comment.find({ post: postId, isActive: true })
            .populate('author', 'name avatar')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        const formattedComments = comments.map(comment => ({
            id: comment._id,
            author: comment.author.name,
            text: comment.text,
            time: getTimeAgo(comment.createdAt)
        }));

        const totalComments = await Comment.countDocuments({ post: postId, isActive: true });
        const totalPages = Math.ceil(totalComments / limit);

        res.status(200).json({
            success: true,
            data: {
                comments: formattedComments,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalComments,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch comments',
            error: error.message
        });
    }
};