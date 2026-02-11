// repositories/commentRepository.js - Comment Repository

const { BaseRepository } = require('./BaseRepository');
const { generateSortKey } = require('../db/schemas/dynamodb-tables');

class CommentRepository extends BaseRepository {
    constructor() {
        super('Comment', 'comments');
    }

    async findByPost(postId, options = {}) {
        if (this.isMongoDB()) {
            return this.find({ post: postId }, {
                ...options,
                sort: options.sort || { createdAt: -1 },
                populate: options.populate || 'user'
            });
        } else {
            const result = await this.getDb().query(this.tableName, {
                keyCondition: 'postId = :postId',
                keyValues: { ':postId': postId },
                limit: options.limit,
                scanForward: false
            });
            return result.items;
        }
    }

    async create(data) {
        if (this.isMongoDB()) {
            return super.create(data);
        } else {
            const id = this.generateId();
            const createdAt = new Date().toISOString();
            const sk = generateSortKey(createdAt, id);

            let postId = data.post || data.postId;
            let userId = data.user || data.userId;
            if (typeof postId === 'object') postId = postId.toString();
            if (typeof userId === 'object') userId = userId.toString();

            return this.getDb().putItem(this.tableName, {
                id, sk, postId, userId, content: data.content, createdAt
            });
        }
    }
}

let instance = null;
const getCommentRepository = () => {
    if (!instance) instance = new CommentRepository();
    return instance;
};

module.exports = { CommentRepository, getCommentRepository };
