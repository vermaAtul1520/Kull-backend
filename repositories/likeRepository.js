// repositories/likeRepository.js - Like Repository

const { BaseRepository } = require('./BaseRepository');

class LikeRepository extends BaseRepository {
    constructor() {
        super('Like', 'likes');
    }

    async findByPost(postId) {
        if (this.isMongoDB()) {
            return this.find({ post: postId }, { populate: 'user' });
        } else {
            return this._queryAll(this.tableName, {
                keyCondition: 'postId = :postId',
                keyValues: { ':postId': postId }
            });
        }
    }

    async findByUser(userId) {
        if (this.isMongoDB()) {
            return this.find({ user: userId });
        } else {
            return this._queryAll(this.tableName, {
                indexName: 'user-index',
                keyCondition: 'userId = :userId',
                keyValues: { ':userId': userId }
            });
        }
    }

    async findLike(postId, userId) {
        if (this.isMongoDB()) {
            return this.findOne({ post: postId, user: userId });
        } else {
            return this.getDb().getItem(this.tableName, { postId, userId });
        }
    }

    async create(data) {
        if (this.isMongoDB()) {
            return super.create(data);
        } else {
            let postId = data.post || data.postId;
            let userId = data.user || data.userId;
            if (typeof postId === 'object') postId = postId.toString();
            if (typeof userId === 'object') userId = userId.toString();

            return this.getDb().putItem(this.tableName, {
                postId, userId, createdAt: new Date().toISOString()
            });
        }
    }

    async deleteLike(postId, userId) {
        if (this.isMongoDB()) {
            return this.deleteOne({ post: postId, user: userId });
        } else {
            return this.getDb().deleteItem(this.tableName, { postId, userId });
        }
    }
}

let instance = null;
const getLikeRepository = () => {
    if (!instance) instance = new LikeRepository();
    return instance;
};

module.exports = { LikeRepository, getLikeRepository };
