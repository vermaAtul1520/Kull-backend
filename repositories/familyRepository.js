// repositories/familyRepository.js - Family Relationship Repository

const { BaseRepository } = require('./BaseRepository');

class FamilyRepository extends BaseRepository {
    constructor() {
        super('FamilyRelationship', 'family');
    }

    // ==========================================
    // DynamoDB field mapping overrides
    // The family table uses userId/relatedUserId as composite keys
    // instead of a single `id` key like other tables.
    // ==========================================

    /**
     * Override: Normalize item for DynamoDB (map user→userId, relatedUser→relatedUserId)
     */
    _normalizeItem(item) {
        if (!this.isDynamoDB() || !item) return item;

        const newItem = {};
        Object.entries(item).forEach(([key, value]) => {
            let newKey = key;
            let newValue = value;

            // Family-specific field mappings
            if (key === 'user') newKey = 'userId';
            if (key === 'relatedUser') newKey = 'relatedUserId';
            if (key === 'community') newKey = 'communityId';
            if (key === 'author') newKey = 'authorId';

            // Stringify ObjectIds
            if (newValue && typeof newValue === 'object' && !Array.isArray(newValue) && !newValue.$regex && !(newValue instanceof RegExp)) {
                newValue = (newValue._id || newValue.id || newValue).toString();
            }

            newItem[newKey] = newValue;
        });

        return newItem;
    }

    /**
     * Override: Denormalize item from DynamoDB (map userId→user, relatedUserId→relatedUser)
     */
    _denormalizeItem(item) {
        if (!item) return item;

        // Map userId → user
        if (item.userId && !item.user) {
            item.user = item.userId;
        }

        // Map relatedUserId → relatedUser
        if (item.relatedUserId && !item.relatedUser) {
            item.relatedUser = item.relatedUserId;
        }

        // Generate a synthetic id from composite key for consistent API responses
        if (!item.id && item.userId && item.relatedUserId) {
            item.id = `${item.userId}__${item.relatedUserId}`;
            item._id = item.id;
        }

        // Strip null values
        Object.keys(item).forEach(key => {
            if (item[key] === null) delete item[key];
        });

        return item;
    }

    // ==========================================
    // DynamoDB key-aware overrides
    // ==========================================

    /**
     * Override findById for DynamoDB: parse composite id back to keys
     */
    async findById(id, options = {}) {
        if (this.isMongoDB()) {
            return super.findById(id, options);
        }

        // Parse synthetic composite id: "userId__relatedUserId"
        const parts = id.split('__');
        if (parts.length === 2) {
            const result = await this.getDb().getItem(this.tableName, {
                userId: parts[0],
                relatedUserId: parts[1]
            });
            return this._transformResult(result);
        }

        // Fallback: scan for the item (shouldn't happen normally)
        const items = await this._scanAll(this.tableName, {
            filterExpression: '#idField = :idVal',
            filterValues: { ':idVal': id },
            expressionAttributeNames: { '#idField': 'id' }
        });
        return items[0] || null;
    }

    /**
     * Override updateById for DynamoDB: parse composite id back to keys
     */
    async updateById(id, updates, options = {}) {
        if (this.isMongoDB()) {
            return super.updateById(id, updates, options);
        }

        const parts = id.split('__');
        if (parts.length === 2) {
            const normalizedUpdates = this._normalizeItem({ ...updates });
            // Don't allow updating keys
            delete normalizedUpdates.userId;
            delete normalizedUpdates.relatedUserId;

            const result = await this.getDb().updateItem(this.tableName, {
                userId: parts[0],
                relatedUserId: parts[1]
            }, normalizedUpdates);
            return this._transformResult(result);
        }

        return null;
    }

    /**
     * Override deleteById for DynamoDB: parse composite id back to keys
     */
    async deleteById(id) {
        if (this.isMongoDB()) {
            return super.deleteById(id);
        }

        const parts = id.split('__');
        if (parts.length === 2) {
            return this.getDb().deleteItem(this.tableName, {
                userId: parts[0],
                relatedUserId: parts[1]
            });
        }

        return false;
    }

    // ==========================================
    // Original query methods (unchanged)
    // ==========================================

    /**
     * Find all relationships for a user
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
     */
    async findRelationship(userId, relatedUserId) {
        if (this.isMongoDB()) {
            return this.findOne({
                user: userId,
                relatedUser: relatedUserId
            });
        } else {
            const result = await this.getDb().getItem(this.tableName, {
                userId,
                relatedUserId
            });
            return this._transformResult(result);
        }
    }

    /**
     * Override findOne for DynamoDB: use direct key lookup when user+relatedUser provided
     */
    async findOne(criteria, options = {}) {
        if (this.isMongoDB()) {
            return super.findOne(criteria, options);
        }

        // If we have both user and relatedUser, do a direct getItem
        const userId = criteria.user || criteria.userId;
        const relatedUserId = criteria.relatedUser || criteria.relatedUserId;
        if (userId && relatedUserId) {
            const result = await this.getDb().getItem(this.tableName, {
                userId: typeof userId === 'object' ? userId.toString() : userId,
                relatedUserId: typeof relatedUserId === 'object' ? relatedUserId.toString() : relatedUserId
            });
            return this._transformResult(result);
        }

        // Fallback to scan
        return super.findOne(criteria, options);
    }

    /**
     * Create a relationship
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
                    : rel.relatedUserId || rel.relatedUser;

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
