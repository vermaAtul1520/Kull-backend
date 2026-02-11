// repositories/postRepository.js - Post Repository
// Handles Post CRUD operations with community-based partitioning

const { BaseRepository } = require('./BaseRepository');
const { generateSortKey, parseSortKey } = require('../db/schemas/dynamodb-tables');

class PostRepository extends BaseRepository {
    constructor() {
        super('Post', 'posts');
    }

    /**
     * Find post by ID
     * @param {string} id 
     * @param {Object} options 
     * @returns {Promise<Object|null>}
     */
    async findById(id, options = {}) {
        if (this.isMongoDB()) {
            return super.findById(id, options);
        } else {
            // DynamoDB: Query by id-index GSI
            const result = await this.getDb().query(this.tableName, {
                indexName: 'id-index',
                keyCondition: 'id = :id',
                keyValues: { ':id': id },
                limit: 1
            });
            return result.items[0] || null;
        }
    }

    /**
     * Find posts by community with pagination
     * @param {string} communityId 
     * @param {Object} options - { skip, limit, isActive }
     * @returns {Promise<Array<Object>>}
     */
    async findByCommunity(communityId, options = {}) {
        if (this.isMongoDB()) {
            const criteria = { community: communityId };
            if (options.isActive !== undefined) {
                criteria.isActive = options.isActive;
            }

            return this.find(criteria, {
                skip: options.skip,
                limit: options.limit,
                sort: options.sort || { createdAt: -1 },
                populate: options.populate || ['author', 'likes', 'comments']
            });
        } else {
            let filterExpression = undefined;
            let filterValues = {};

            if (options.isActive !== undefined) {
                filterExpression = 'isActive = :isActive';
                filterValues[':isActive'] = options.isActive;
            }

            const expressionAttributeNames = {};
            if (options.isActive !== undefined) {
                expressionAttributeNames['#isActive'] = 'isActive';
            }

            const result = await this.getDb().query(this.tableName, {
                keyCondition: 'communityId = :communityId',
                keyValues: { ':communityId': communityId },
                filterExpression: options.isActive !== undefined ? '#isActive = :isActive' : undefined,
                filterValues: Object.keys(filterValues).length > 0 ? filterValues : undefined,
                expressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
                limit: options.limit,
                scanForward: false // Newest first
            });

            return result.items;
        }
    }

    /**
     * Find posts by author
     * @param {string} authorId 
     * @param {Object} options 
     * @returns {Promise<Array<Object>>}
     */
    async findByAuthor(authorId, options = {}) {
        if (this.isMongoDB()) {
            return this.find({ author: authorId }, {
                skip: options.skip,
                limit: options.limit,
                sort: options.sort || { createdAt: -1 }
            });
        } else {
            const result = await this.getDb().query(this.tableName, {
                indexName: 'author-index',
                keyCondition: 'authorId = :authorId',
                keyValues: { ':authorId': authorId },
                limit: options.limit,
                scanForward: false
            });
            return result.items;
        }
    }

    /**
     * Create a new post
     * @param {Object} postData 
     * @returns {Promise<Object>}
     */
    async create(postData) {
        if (this.isMongoDB()) {
            return super.create(postData);
        } else {
            // Generate ID and sort key
            const id = this.generateId();
            const createdAt = new Date().toISOString();
            const sk = generateSortKey(createdAt, id);

            // Convert ObjectIds to strings
            const communityId = (postData.community && typeof postData.community === 'object')
                ? postData.community.toString()
                : postData.community;
            const authorId = (postData.author && typeof postData.author === 'object')
                ? postData.author.toString()
                : postData.author;

            const item = {
                ...postData,
                id,
                sk,
                communityId,
                authorId,
                createdAt,
                isActive: postData.isActive !== undefined ? postData.isActive : true,
                likes: [],
                comments: []
            };

            delete item.community;
            delete item.author;

            return this.getDb().putItem(this.tableName, item);
        }
    }

    /**
     * Toggle post active status
     * @param {string} postId 
     * @param {boolean} isActive 
     * @returns {Promise<Object|null>}
     */
    async toggleActive(postId, isActive) {
        return this.updateById(postId, { isActive });
    }

    /**
     * Add like to post
     * @param {string} postId 
     * @param {string} likeId 
     * @returns {Promise<Object|null>}
     */
    async addLike(postId, likeId) {
        if (this.isMongoDB()) {
            const Model = this.getDb().getModel(this.entityName);
            return Model.findByIdAndUpdate(
                postId,
                { $addToSet: { likes: likeId } },
                { new: true }
            ).lean();
        } else {
            const post = await this.findById(postId);
            if (!post) return null;

            const likes = post.likes || [];
            if (!likes.includes(likeId)) {
                likes.push(likeId);
            }

            return this.updateById(postId, { likes });
        }
    }

    /**
     * Remove like from post
     * @param {string} postId 
     * @param {string} likeId 
     * @returns {Promise<Object|null>}
     */
    async removeLike(postId, likeId) {
        if (this.isMongoDB()) {
            const Model = this.getDb().getModel(this.entityName);
            return Model.findByIdAndUpdate(
                postId,
                { $pull: { likes: likeId } },
                { new: true }
            ).lean();
        } else {
            const post = await this.findById(postId);
            if (!post) return null;

            const likes = (post.likes || []).filter(id => id !== likeId);
            return this.updateById(postId, { likes });
        }
    }

    /**
     * Add comment to post
     * @param {string} postId 
     * @param {string} commentId 
     * @returns {Promise<Object|null>}
     */
    async addComment(postId, commentId) {
        if (this.isMongoDB()) {
            const Model = this.getDb().getModel(this.entityName);
            return Model.findByIdAndUpdate(
                postId,
                { $push: { comments: commentId } },
                { new: true }
            ).lean();
        } else {
            const post = await this.findById(postId);
            if (!post) return null;

            const comments = post.comments || [];
            comments.push(commentId);

            return this.updateById(postId, { comments });
        }
    }

    /**
     * Delete post by ID (with DynamoDB key handling)
     * @param {string} id 
     * @returns {Promise<boolean>}
     */
    async deleteById(id) {
        if (this.isMongoDB()) {
            return super.deleteById(id);
        } else {
            // Need to get the post first to get communityId and sk
            const post = await this.findById(id);
            if (!post) return false;

            return this.getDb().deleteItem(this.tableName, {
                communityId: post.communityId,
                sk: post.sk
            });
        }
    }

    /**
     * Update post by ID (with DynamoDB key handling)
     * @param {string} id 
     * @param {Object} updates 
     * @returns {Promise<Object|null>}
     */
    async updateById(id, updates) {
        if (this.isMongoDB()) {
            return super.updateById(id, updates);
        } else {
            const post = await this.findById(id);
            if (!post) return null;

            return this.getDb().updateItem(this.tableName, {
                communityId: post.communityId,
                sk: post.sk
            }, updates);
        }
    }
}

// Singleton instance
let postRepositoryInstance = null;

const getPostRepository = () => {
    if (!postRepositoryInstance) {
        postRepositoryInstance = new PostRepository();
    }
    return postRepositoryInstance;
};

module.exports = {
    PostRepository,
    getPostRepository
};
