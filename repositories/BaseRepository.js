// repositories/BaseRepository.js - Abstract Base Repository
// Provides common CRUD operations that work with both MongoDB and DynamoDB

const { getDatabaseType, getAdapter } = require('../db');

/**
 * Base Repository class that provides common CRUD operations
 * Subclasses should override methods for entity-specific behavior
 */
class BaseRepository {
    /**
     * @param {string} entityName - Name of the entity (e.g., 'User', 'Post')
     * @param {string} tableName - DynamoDB table name (e.g., 'users', 'posts')
     */
    constructor(entityName, tableName) {
        this.entityName = entityName;
        this.tableName = tableName;
        this.dbType = getDatabaseType();
    }

    /**
     * Get the database adapter
     * @returns {Object}
     */
    getDb() {
        return getAdapter();
    }

    /**
     * Check if using MongoDB
     * @returns {boolean}
     */
    isMongoDB() {
        return this.dbType === 'mongodb';
    }

    /**
     * Check if using DynamoDB
     * @returns {boolean}
     */
    isDynamoDB() {
        return this.dbType === 'dynamodb';
    }

    /**
     * Generate a new ID
     * @returns {string|ObjectId}
     */
    generateId() {
        return this.getDb().generateId();
    }

    /**
     * Find entity by ID
     * @param {string} id 
     * @param {Object} options - Additional options (select, populate for MongoDB)
     * @returns {Promise<Object|null>}
     */
    async findById(id, options = {}) {
        if (this.isMongoDB()) {
            const Model = this.getDb().getModel(this.entityName);
            let query = Model.findById(id);

            if (options.select) {
                query = query.select(options.select);
            }
            if (options.populate) {
                query = query.populate(options.populate);
            }

            const result = await query.lean();
            return this._transformResult(result);
        } else {
            const result = await this.getDb().getItem(this.tableName, { id });
            return this._transformResult(result);
        }
    }

    /**
     * Get many entities by their IDs
     * @param {Array<string>} ids 
     * @returns {Promise<Array<Object>>}
     */
    async getManyByIds(ids) {
        if (!ids || ids.length === 0) return [];

        if (this.isMongoDB()) {
            const Model = this.getDb().getModel(this.entityName);
            const results = await Model.find({ _id: { $in: ids } }).lean();
            return this._transformResult(results);
        } else {
            // DynamoDB: Use scan with IN clause
            // Note: Limited to 100 per batch by DynamoDB for some operations, 
            // but for Scan FilterExpression, we just need to avoid reserved words like "id"
            const result = await this.getDb().scan(this.tableName, {
                filterExpression: '#idFieldName IN (' + ids.map((_, i) => `:id${i}`).join(',') + ')',
                filterValues: ids.reduce((acc, id, i) => ({ ...acc, [`:id${i}`]: id }), {}),
                expressionAttributeNames: { '#idFieldName': 'id' }
            });
            return this._transformResult(result.items);
        }
    }

    /**
     * Find one entity matching criteria
     * @param {Object} criteria 
     * @param {Object} options 
     * @returns {Promise<Object|null>}
     */
    async findOne(criteria, options = {}) {
        if (this.isMongoDB()) {
            const Model = this.getDb().getModel(this.entityName);
            let query = Model.findOne(criteria);

            if (options.select) {
                query = query.select(options.select);
            }
            if (options.populate) {
                query = query.populate(options.populate);
            }

            const result = await query.lean();
            return this._transformResult(result);
        } else {
            // DynamoDB: Need to implement index-based query
            // This is a fallback using scan - should be overridden in subclass
            const result = await this.getDb().scan(this.tableName, {
                filterExpression: this._buildFilterExpression(criteria),
                filterValues: this._buildFilterValues(criteria),
                expressionAttributeNames: this._buildExpressionNames(criteria),
                limit: 1
            });
            return this._transformResult(result.items[0]) || null;
        }
    }

    /**
     * Find all entities matching criteria
     * @param {Object} criteria 
     * @param {Object} options - { skip, limit, sort, select, populate }
     * @returns {Promise<Array<Object>>}
     */
    async find(criteria = {}, options = {}) {
        if (this.isMongoDB()) {
            const Model = this.getDb().getModel(this.entityName);
            let query = Model.find(criteria);

            if (options.select) {
                query = query.select(options.select);
            }
            if (options.populate) {
                query = query.populate(options.populate);
            }
            if (options.sort) {
                query = query.sort(options.sort);
            }
            if (options.skip) {
                query = query.skip(options.skip);
            }
            if (options.limit) {
                query = query.limit(options.limit);
            }

            const result = await query.lean();
            return this._transformResult(result);
        } else {
            // DynamoDB: Generic scan - should be overridden for efficient queries
            const result = await this.getDb().scan(this.tableName, {
                filterExpression: Object.keys(criteria).length > 0
                    ? this._buildFilterExpression(criteria)
                    : undefined,
                filterValues: Object.keys(criteria).length > 0
                    ? this._buildFilterValues(criteria)
                    : undefined,
                expressionAttributeNames: Object.keys(criteria).length > 0
                    ? this._buildExpressionNames(criteria)
                    : undefined,
                limit: options.limit
            });
            return this._transformResult(result.items);
        }
    }

    /**
     * Create a new entity
     * @param {Object} data 
     * @returns {Promise<Object>}
     */
    async create(data) {
        if (this.isMongoDB()) {
            const Model = this.getDb().getModel(this.entityName);
            const doc = new Model(data);
            const saved = await doc.save();
            return this._transformResult(saved.toObject());
        } else {
            // Add ID if not present or empty
            if (!data.id || data.id === "") {
                data.id = this.generateId();
            }
            // Also ensure _id is removed for DynamoDB logic to avoid PK confusion if passed
            delete data._id;

            const result = await this.getDb().putItem(this.tableName, data);
            return this._transformResult(result);
        }
    }

    /**
     * Update an entity by ID
     * @param {string} id 
     * @param {Object} updates 
     * @param {Object} options 
     * @returns {Promise<Object|null>}
     */
    async updateById(id, updates, options = {}) {
        if (this.isMongoDB()) {
            const Model = this.getDb().getModel(this.entityName);
            const result = await Model.findByIdAndUpdate(
                id,
                updates,
                { new: true, runValidators: true, ...options }
            ).lean();
            return this._transformResult(result);
        } else {
            const result = await this.getDb().updateItem(this.tableName, { id }, updates);
            return this._transformResult(result);
        }
    }

    /**
     * Update one entity matching criteria
     * @param {Object} criteria 
     * @param {Object} updates 
     * @returns {Promise<Object|null>}
     */
    async updateOne(criteria, updates) {
        if (this.isMongoDB()) {
            const Model = this.getDb().getModel(this.entityName);
            const result = await Model.findOneAndUpdate(
                criteria,
                updates,
                { new: true, runValidators: true }
            ).lean();
            return this._transformResult(result);
        } else {
            // Find first, then update
            const existing = await this.findOne(criteria);
            if (!existing) return null;
            return this.updateById(existing.id, updates);
        }
    }

    /**
     * Delete entity by ID
     * @param {string} id 
     * @returns {Promise<boolean>}
     */
    async deleteById(id) {
        if (this.isMongoDB()) {
            const Model = this.getDb().getModel(this.entityName);
            const result = await Model.findByIdAndDelete(id);
            return !!result;
        } else {
            return this.getDb().deleteItem(this.tableName, { id });
        }
    }

    /**
     * Delete one entity matching criteria
     * @param {Object} criteria 
     * @returns {Promise<boolean>}
     */
    async deleteOne(criteria) {
        if (this.isMongoDB()) {
            const Model = this.getDb().getModel(this.entityName);
            const result = await Model.deleteOne(criteria);
            return result.deletedCount > 0;
        } else {
            const existing = await this.findOne(criteria);
            if (!existing) return false;
            return this.deleteById(existing.id);
        }
    }

    /**
     * Count entities matching criteria
     * @param {Object} criteria 
     * @returns {Promise<number>}
     */
    async count(criteria = {}) {
        if (this.isMongoDB()) {
            const Model = this.getDb().getModel(this.entityName);
            return Model.countDocuments(criteria);
        } else {
            // DynamoDB: Count via scan (expensive - should use for small datasets)
            const result = await this.getDb().scan(this.tableName, {
                filterExpression: Object.keys(criteria).length > 0
                    ? this._buildFilterExpression(criteria)
                    : undefined,
                filterValues: Object.keys(criteria).length > 0
                    ? this._buildFilterValues(criteria)
                    : undefined,
                expressionAttributeNames: Object.keys(criteria).length > 0
                    ? this._buildExpressionNames(criteria)
                    : undefined,
            });
            return result.count || 0;
        }
    }

    /**
     * Check if entity exists
     * @param {Object} criteria 
     * @returns {Promise<boolean>}
     */
    async exists(criteria) {
        const doc = await this.findOne(criteria, { select: '_id id' });
        return !!doc;
    }

    /**
     * Transform result to ensure consistent ID fields (both id and _id)
     * @param {Object|Array} result 
     * @returns {Object|Array}
     * @private
     */
    _transformResult(result) {
        if (!result) return result;

        if (Array.isArray(result)) {
            return result.map(item => this._transformItem(item));
        }

        return this._transformItem(result);
    }

    /**
     * Transform single item to ensure consistent ID fields
     * @param {Object} item 
     * @returns {Object}
     * @private
     */
    _transformItem(item) {
        if (!item || typeof item !== 'object') return item;

        // Ensure Mongo _id is reflected in id
        if (item._id && !item.id) {
            item.id = item._id.toString();
        }

        // Ensure Dynamo id is reflected in _id
        if (item.id && !item._id) {
            item._id = item.id;
        }

        return item;
    }

    // ==========================================
    // DynamoDB pagination helpers
    // ==========================================

    /**
     * Query all items across multiple DynamoDB pages (loops on LastEvaluatedKey)
     * Returns transformed results with id/_id normalization
     * @param {string} tableName
     * @param {Object} params - Query params (keyCondition, keyValues, indexName, filterExpression, filterValues, expressionAttributeNames, scanForward)
     * @returns {Promise<Array<Object>>}
     * @protected
     */
    async _queryAll(tableName, params) {
        let allItems = [];
        let lastEvaluatedKey;
        do {
            const result = await this.getDb().query(tableName, {
                ...params,
                exclusiveStartKey: lastEvaluatedKey
            });
            allItems.push(...result.items);
            lastEvaluatedKey = result.lastEvaluatedKey;
        } while (lastEvaluatedKey);
        return this._transformResult(allItems);
    }

    /**
     * Scan all items across multiple DynamoDB pages (loops on LastEvaluatedKey)
     * Returns transformed results with id/_id normalization
     * @param {string} tableName
     * @param {Object} params - Scan params (filterExpression, filterValues, expressionAttributeNames)
     * @returns {Promise<Array<Object>>}
     * @protected
     */
    async _scanAll(tableName, params = {}) {
        let allItems = [];
        let lastEvaluatedKey;
        do {
            const result = await this.getDb().scan(tableName, {
                ...params,
                exclusiveStartKey: lastEvaluatedKey
            });
            allItems.push(...result.items);
            lastEvaluatedKey = result.lastEvaluatedKey;
        } while (lastEvaluatedKey);
        return this._transformResult(allItems);
    }

    // ==========================================
    // Helper methods for DynamoDB
    // ==========================================

    /**
     * Build DynamoDB filter expression from criteria object
     * @private
     */
    _buildFilterExpression(criteria) {
        if (criteria.$or && Array.isArray(criteria.$or)) {
            const expressions = criteria.$or.map((cond, i) => {
                const subKeys = Object.keys(cond);
                return subKeys.map((k, j) => {
                    const val = cond[k];
                    if (val && typeof val === 'object' && val.$regex) {
                        return `contains(#orField${i}_${j}, :orVal${i}_${j})`;
                    }
                    return `#orField${i}_${j} = :orVal${i}_${j}`;
                }).join(' AND ');
            });
            return `(${expressions.join(') OR (')})`;
        }

        const conditions = Object.keys(criteria).map((key, index) => {
            const value = criteria[key];
            if (value && typeof value === 'object' && value.$regex) {
                return `contains(#field${index}, :val${index})`;
            }
            return `#field${index} = :val${index}`;
        });
        return conditions.join(' AND ');
    }

    /**
     * Build DynamoDB expression attribute values
     * @private
     */
    _buildFilterValues(criteria) {
        const values = {};
        if (criteria.$or && Array.isArray(criteria.$or)) {
            criteria.$or.forEach((cond, i) => {
                Object.keys(cond).forEach((k, j) => {
                    const val = cond[k];
                    values[`:orVal${i}_${j}`] = (val && typeof val === 'object' && val.$regex) ? val.$regex : val;
                });
            });
            return values;
        }

        Object.values(criteria).forEach((value, index) => {
            values[`:val${index}`] = (value && typeof value === 'object' && value.$regex) ? value.$regex : value;
        });
        return values;
    }

    /**
     * Build DynamoDB expression attribute names
     * @private
     */
    _buildExpressionNames(criteria) {
        const names = {};
        if (criteria.$or && Array.isArray(criteria.$or)) {
            criteria.$or.forEach((cond, i) => {
                Object.keys(cond).forEach((k, j) => {
                    names[`#orField${i}_${j}`] = k;
                });
            });
            return names;
        }

        Object.keys(criteria).forEach((key, index) => {
            names[`#field${index}`] = key;
        });
        return names;
    }
}

module.exports = { BaseRepository };
