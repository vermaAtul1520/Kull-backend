// services/postService.js - Post Service
// Handles post-related business logic

const { getPostRepository } = require('../repositories/postRepository');
const { getCommentRepository } = require('../repositories/commentRepository');
const { getLikeRepository } = require('../repositories/likeRepository');

class PostService {
    constructor() {
        this.postRepo = getPostRepository();
        this.commentRepo = getCommentRepository();
        this.likeRepo = getLikeRepository();
    }

    /**
     * Create a new post
     */
    async createPost(postData, authorId, communityId) {
        return this.postRepo.create({
            ...postData,
            author: authorId,
            community: communityId,
        });
    }

    /**
     * Get post by ID
     */
    async getPostById(postId) {
        return this.postRepo.findById(postId);
    }

    /**
     * Get posts by community
     */
    async getPostsByCommunity(communityId, options = {}) {
        return this.postRepo.findByCommunity(communityId, {
            ...options,
            isActive: true,
        });
    }

    /**
     * Get posts by author
     */
    async getPostsByAuthor(authorId, options = {}) {
        return this.postRepo.findByAuthor(authorId, options);
    }

    /**
     * Update post
     */
    async updatePost(postId, updates, userId) {
        const post = await this.postRepo.findById(postId);
        if (!post) {
            throw { status: 404, message: 'Post not found' };
        }

        const authorId = post.author?._id || post.author || post.authorId;
        if (authorId?.toString() !== userId?.toString()) {
            throw { status: 403, message: 'Not authorized to update this post' };
        }

        return this.postRepo.updateById(postId, updates);
    }

    /**
     * Delete post
     */
    async deletePost(postId, userId, isAdmin = false) {
        const post = await this.postRepo.findById(postId);
        if (!post) {
            throw { status: 404, message: 'Post not found' };
        }

        const authorId = post.author?._id || post.author || post.authorId;
        if (!isAdmin && authorId?.toString() !== userId?.toString()) {
            throw { status: 403, message: 'Not authorized to delete this post' };
        }

        return this.postRepo.deleteById(postId);
    }

    /**
     * Toggle post active status
     */
    async togglePostStatus(postId, isActive) {
        return this.postRepo.toggleActive(postId, isActive);
    }

    /**
     * Like a post
     */
    async likePost(postId, userId) {
        // Check if already liked
        const existingLike = await this.likeRepo.findLike(postId, userId);
        if (existingLike) {
            return { alreadyLiked: true };
        }

        await this.likeRepo.create({ post: postId, user: userId });
        await this.postRepo.addLike(postId, userId);
        return { success: true };
    }

    /**
     * Unlike a post
     */
    async unlikePost(postId, userId) {
        await this.likeRepo.deleteLike(postId, userId);
        await this.postRepo.removeLike(postId, userId);
        return { success: true };
    }

    /**
     * Add comment to post
     */
    async addComment(postId, userId, content) {
        const comment = await this.commentRepo.create({
            post: postId,
            user: userId,
            content,
        });

        await this.postRepo.addComment(postId, comment._id || comment.id);
        return comment;
    }

    /**
     * Get comments for post
     */
    async getComments(postId, options = {}) {
        return this.commentRepo.findByPost(postId, options);
    }

    /**
     * Delete comment
     */
    async deleteComment(commentId, userId, isAdmin = false) {
        const comment = await this.commentRepo.findById(commentId);
        if (!comment) {
            throw { status: 404, message: 'Comment not found' };
        }

        const commentUserId = comment.user?._id || comment.user || comment.userId;
        if (!isAdmin && commentUserId?.toString() !== userId?.toString()) {
            throw { status: 403, message: 'Not authorized to delete this comment' };
        }

        return this.commentRepo.deleteById(commentId);
    }
}

let postServiceInstance = null;

const getPostService = () => {
    if (!postServiceInstance) {
        postServiceInstance = new PostService();
    }
    return postServiceInstance;
};

module.exports = { PostService, getPostService };
