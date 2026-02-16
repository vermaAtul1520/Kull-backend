// repositories/familyRepository.js - Family Relationship Repository

const { BaseRepository } = require('./BaseRepository');

class FamilyRepository extends BaseRepository {
    constructor() {
        super('FamilyRelationship', 'family');
    }

    /**
     * Find all relationships for a user
     * @param {string} userId 
     * @returns {Promise<Array<Object>>}
     */
    async findByUser(userId) {
        if (this.isMongoDB()) {
            return this.find({ user: userId }, {
                populate: ['relatedUser', 'user']
            });
        } else {
            return this._queryAll(this.tableName, {
                keyCondition: 'userId = :userId',
                keyValues: { ':userId': userId }
            });
        }
    }

    /**
     * Find all relationships where user is the related user
     * @param {string} userId 
     * @returns {Promise<Array<Object>>}
     */
    async findByRelatedUser(userId) {
        if (this.isMongoDB()) {
            return this.find({ relatedUser: userId }, {
                populate: ['relatedUser', 'user']
            });
        } else {
            return this._queryAll(this.tableName, {
                indexName: 'reverse-index',
                keyCondition: 'relatedUserId = :relatedUserId',
                keyValues: { ':relatedUserId': userId }
            });
        }
    }

    /**
     * Get all relationships for a user (both directions)
     * @param {string} userId 
     * @returns {Promise<Array<Object>>}
     */
    async findAllRelationships(userId) {
        const [asUser, asRelatedUser] = await Promise.all([
            this.findByUser(userId),
            this.findByRelatedUser(userId)
        ]);
        return [...asUser, ...asRelatedUser];
    }

    /**
     * Find specific relationship between two users
     * @param {string} userId 
     * @param {string} relatedUserId 
     * @returns {Promise<Object|null>}
     */
    async findRelationship(userId, relatedUserId) {
        if (this.isMongoDB()) {
            return this.findOne({
                user: userId,
                relatedUser: relatedUserId
            });
        } else {
            return this.getDb().getItem(this.tableName, {
                userId,
                relatedUserId
            });
        }
    }

    /**
     * Create a relationship
     * @param {Object} data 
     * @returns {Promise<Object>}
     */
    async create(data) {
        if (this.isMongoDB()) {
            return super.create(data);
        } else {
            let userId = data.user || data.userId;
            let relatedUserId = data.relatedUser || data.relatedUserId;
            let createdBy = data.createdBy;

            if (typeof userId === 'object') userId = userId.toString();
            if (typeof relatedUserId === 'object') relatedUserId = relatedUserId.toString();
            if (typeof createdBy === 'object') createdBy = createdBy.toString();

            const item = {
                userId,
                relatedUserId,
                relationType: data.relationType,
                createdBy,
                createdAt: new Date().toISOString()
            };

            return this.getDb().putItem(this.tableName, item);
        }
    }

    /**
     * Delete relationship between two users
     * @param {string} userId 
     * @param {string} relatedUserId 
     * @returns {Promise<boolean>}
     */
    async deleteRelationship(userId, relatedUserId) {
        if (this.isMongoDB()) {
            return this.deleteOne({
                user: userId,
                relatedUser: relatedUserId
            });
        } else {
            return this.getDb().deleteItem(this.tableName, {
                userId,
                relatedUserId
            });
        }
    }

    /**
     * Update relationship type
     * @param {string} userId 
     * @param {string} relatedUserId 
     * @param {string} relationType 
     * @returns {Promise<Object|null>}
     */
    async updateRelationType(userId, relatedUserId, relationType) {
        if (this.isMongoDB()) {
            return this.updateOne(
                { user: userId, relatedUser: relatedUserId },
                { relationType }
            );
        } else {
            return this.getDb().updateItem(this.tableName,
                { userId, relatedUserId },
                { relationType }
            );
        }
    }

    /**
     * Get family tree for a user (recursive)
     * @param {string} userId 
     * @param {number} depth - How many levels to traverse
     * @returns {Promise<Object>}
     */
    async getFamilyTree(userId, depth = 3) {
        const visited = new Set();

        const buildTree = async (currentUserId, currentDepth) => {
            if (currentDepth <= 0 || visited.has(currentUserId)) {
                return null;
            }

            visited.add(currentUserId);
            const relationships = await this.findByUser(currentUserId);

            const tree = {
                userId: currentUserId,
                relationships: []
            };

            for (const rel of relationships) {
                const relatedId = this.isMongoDB()
                    ? (rel.relatedUser?._id || rel.relatedUser).toString()
                    : rel.relatedUserId;

                const childTree = await buildTree(relatedId, currentDepth - 1);

                tree.relationships.push({
                    relationType: rel.relationType,
                    relatedUser: rel.relatedUser || { id: relatedId },
                    children: childTree
                });
            }

            return tree;
        };

        return buildTree(userId, depth);
    }
}

let familyRepositoryInstance = null;
const getFamilyRepository = () => {
    if (!familyRepositoryInstance) {
        familyRepositoryInstance = new FamilyRepository();
    }
    return familyRepositoryInstance;
};

module.exports = { FamilyRepository, getFamilyRepository };
