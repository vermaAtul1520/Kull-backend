// repositories/CommunityEntityRepository.js - Base for Community-Scoped Entities
// Shared logic for entities that belong to a community (donations, news, appeals, etc.)

const { BaseRepository } = require('./BaseRepository');
const { generateSortKey, parseSortKey } = require('../db/schemas/dynamodb-tables');

/**
 * Base repository for entities that are scoped to a community
 * Provides common patterns for community-based queries
 */
class CommunityEntityRepository extends BaseRepository {
    /**
     * @param {string} entityName - Mongoose model name
     * @param {string} tableName - DynamoDB table name
     * @param {string} communityField - Field name for community reference (default: 'communityId')
     */
    constructor(entityName, tableName, communityField = 'communityId') {
        super(entityName, tableName);
        this.communityField = communityField;
    }

    /**
     * Find entity by ID
     * @param {string} id 
     * @param {Object} options 
     * @returns {Promise<Object|null>}
     */
    async findById(id, options = {}) {
        if (this.isMongoDB()) {
            return super.findById(id, options);
        } else {
            // DynamoDB: Query by id-index GSI
            try {
                const result = await this.getDb().query(this.tableName, {
                    indexName: 'id-index',
                    keyCondition: 'id = :id',
                    keyValues: { ':id': id },
                    limit: 1
                });
                return this._transformResult(result.items[0]) || null;
            } catch (error) {
                // Fallback for tables without id-index (like occasion-categories)
                if (error.name === 'ValidationException' || error.message.includes('index')) {
                    const result = await this.getDb().scan(this.tableName, {
                        filterExpression: 'id = :id',
                        filterValues: { ':id': id },
                        limit: 1
                    });
                    return this._transformResult(result.items[0]) || null;
                }
                throw error;
            }
        }
    }

    /**
     * Find entities by community with pagination
     * @param {string} communityId 
     * @param {Object} options - { skip, limit, sort, filters }
     * @returns {Promise<Array<Object>>}
     */
    async findByCommunity(communityId, options = {}) {
        communityId = String(communityId);
        if (this.isMongoDB()) {
            const criteria = { [this.communityField]: communityId };

            // Add any additional filters
            if (options.filters) {
                Object.assign(criteria, options.filters);
            }

            return this.find(criteria, {
                skip: options.skip,
                limit: options.limit,
                sort: options.sort || { createdAt: -1 },
                populate: options.populate
            });
        } else {
            let filterExpression = undefined;
            let filterValues = {};

            // Build filter expression from options.filters
            if (options.filters) {
                const conditions = [];
                Object.entries(options.filters).forEach(([key, value], index) => {
                    conditions.push(`#filter${index} = :filterVal${index}`);
                    filterValues[`:filterVal${index}`] = value;
                });
                if (conditions.length > 0) {
                    filterExpression = conditions.join(' AND ');
                }
            }

            const expressionAttributeNames = {};
            if (options.filters) {
                Object.keys(options.filters).forEach((key, index) => {
                    expressionAttributeNames[`#filter${index}`] = key;
                });
            }

            const result = await this.getDb().query(this.tableName, {
                keyCondition: 'communityId = :communityId',
                keyValues: { ':communityId': communityId },
                filterExpression,
                filterValues: Object.keys(filterValues).length > 0 ? filterValues : undefined,
                expressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
                limit: options.limit,
                scanForward: false // Newest first by default
            });

            return this._transformResult(result.items);
        }
    }

    /**
     * Count entities in a community
     * @param {string} communityId 
     * @param {Object} filters 
     * @returns {Promise<number>}
     */
    async countByCommunity(communityId, filters = {}) {
        communityId = String(communityId);
        if (this.isMongoDB()) {
            const criteria = { [this.communityField]: communityId, ...filters };
            return this.count(criteria);
        } else {
            const items = await this.findByCommunity(communityId, { filters });
            return items.length;
        }
    }

    /**
     * Create a new entity with community scope
     * @param {Object} data 
     * @returns {Promise<Object>}
     */
    async create(data) {
        if (this.isMongoDB()) {
            return super.create(data);
        } else {
            // Generate ID and sort key
            const id = this.generateId();
            const createdAt = new Date().toISOString();
            const sk = generateSortKey(createdAt, id);

            // Extract communityId from various possible field names
            let communityId = data.communityId || data.community;
            if (communityId && typeof communityId === 'object') {
                communityId = communityId.toString();
            }

            // Extract createdBy if present
            let createdBy = data.createdBy;
            if (createdBy && typeof createdBy === 'object') {
                createdBy = createdBy.toString();
            }

            const item = {
                ...data,
                id,
                sk,
                communityId,
                createdBy,
                createdAt
            };

            // Remove MongoDB-style fields
            delete item.community;

            return this.getDb().putItem(this.tableName, item);
        }
    }

    /**
     * Update entity by ID (with DynamoDB key handling)
     * @param {string} id 
     * @param {Object} updates 
     * @returns {Promise<Object|null>}
     */
    async updateById(id, updates) {
        if (this.isMongoDB()) {
            return super.updateById(id, updates);
        } else {
            const entity = await this.findById(id);
            if (!entity) return null;

            return this.getDb().updateItem(this.tableName, {
                communityId: entity.communityId,
                sk: entity.sk
            }, updates);
        }
    }

    /**
     * Delete entity by ID (with DynamoDB key handling)
     * @param {string} id 
     * @returns {Promise<boolean>}
     */
    async deleteById(id) {
        if (this.isMongoDB()) {
            return super.deleteById(id);
        } else {
            const entity = await this.findById(id);
            if (!entity) return false;

            return this.getDb().deleteItem(this.tableName, {
                communityId: entity.communityId,
                sk: entity.sk
            });
        }
    }

    /**
     * Find recent entities across all communities (admin use)
     * @param {Object} options 
     * @returns {Promise<Array<Object>>}
     */
    async findRecent(options = {}) {
        if (this.isMongoDB()) {
            return this.find({}, {
                limit: options.limit || 20,
                sort: { createdAt: -1 }
            });
        } else {
            // DynamoDB: Scan (expensive - use sparingly)
            const result = await this.getDb().scan(this.tableName, {
                limit: options.limit || 20
            });
            // Sort by createdAt descending
            const sorted = result.items.sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            );
            return this._transformResult(sorted);
        }
    }
}

module.exports = { CommunityEntityRepository };
