// repositories/userRepository.js - User Repository
// Handles all User CRUD operations for both MongoDB and DynamoDB

const { BaseRepository } = require('./BaseRepository');
const { generateSortKey } = require('../db/schemas/dynamodb-tables');
const bcrypt = require('bcryptjs');

class UserRepository extends BaseRepository {
    constructor() {
        super('User', 'users');
    }

    /**
     * Generate user code (replicated from Mongoose pre-save hook)
     * @param {Object} userData 
     * @returns {string}
     */
    generateUserCode(userData) {
        const firstInitial = userData.firstName ? userData.firstName.charAt(0).toUpperCase() : 'U';
        const lastInitial = userData.lastName ? userData.lastName.charAt(0).toUpperCase() : 'U';
        const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
        const random = Math.random().toString(36).slice(-3).toUpperCase();
        return `${firstInitial}${lastInitial}${timestamp}${random}`;
    }

    /**
     * Find user by email
     * @param {string} email 
     * @param {Object} options 
     * @returns {Promise<Object|null>}
     */
    async findByEmail(email, options = {}) {
        const results = await this.findAllByEmail(email, options);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Find all users by email
     * @param {string} email 
     * @param {Object} options 
     * @returns {Promise<Array<Object>>}
     */
    async findAllByEmail(email, options = {}) {
        if (this.isMongoDB()) {
            const Model = this.getDb().getModel(this.entityName);
            const normalizedEmail = email.trim().toLowerCase();
            let query = Model.find({ email: normalizedEmail });

            if (options.includePassword) {
                query = query.select('+password +plainTextPassword');
            }
            if (options.populate) {
                query = query.populate(options.populate);
            }

            const results = await query.lean();
            return this._transformResult(results);
        } else {
            const normalizedEmail = email.trim().toLowerCase();
            const result = await this.getDb().query(this.tableName, {
                indexName: 'email-index',
                keyCondition: 'email = :email',
                keyValues: { ':email': normalizedEmail }
            });
            return result.items.map(item => this._transformResult(item));
        }
    }

    /**
     * Find user by phone
     * @param {string} phone 
     * @param {Object} options 
     * @returns {Promise<Object|null>}
     */
    async findByPhone(phone, options = {}) {
        const results = await this.findAllByPhone(phone, options);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Find all users by phone
     * @param {string} phone 
     * @param {Object} options 
     * @returns {Promise<Array<Object>>}
     */
    async findAllByPhone(phone, options = {}) {
        if (this.isMongoDB()) {
            const Model = this.getDb().getModel(this.entityName);
            const normalizedPhone = phone.trim();
            let query = Model.find({ phone: normalizedPhone });

            if (options.includePassword) {
                query = query.select('+password +plainTextPassword');
            }
            if (options.populate) {
                query = query.populate(options.populate);
            }

            const results = await query.lean();
            return this._transformResult(results);
        } else {
            const normalizedPhone = phone.trim();
            const result = await this.getDb().query(this.tableName, {
                indexName: 'phone-index',
                keyCondition: 'phone = :phone',
                keyValues: { ':phone': normalizedPhone }
            });
            return result.items.map(item => this._transformResult(item));
        }
    }

    /**
     * Find user by code
     * @param {string} code 
     * @returns {Promise<Object|null>}
     */
    async findByCode(code) {
        if (this.isMongoDB()) {
            return this.findOne({ code });
        } else {
            const result = await this.getDb().query(this.tableName, {
                indexName: 'code-index',
                keyCondition: 'code = :code',
                keyValues: { ':code': code },
                limit: 1
            });
            return result.items[0] || null;
        }
    }

    /**
     * Find users by community
     * @param {string} communityId 
     * @param {Object} options - { skip, limit, status, role }
     * @returns {Promise<Array<Object>>}
     */
    async findByCommunity(communityId, options = {}) {
        if (this.isMongoDB()) {
            const criteria = { community: communityId };

            if (options.status) {
                criteria.communityStatus = options.status;
            } else if (options.communityStatus) {
                criteria.communityStatus = options.communityStatus;
            }
            if (options.role) {
                criteria.roleInCommunity = options.role;
            } else if (options.roleInCommunity) {
                criteria.roleInCommunity = options.roleInCommunity;
            }

            return this.find(criteria, {
                skip: options.skip,
                limit: options.limit,
                sort: options.sort || { createdAt: -1 },
                populate: options.populate
            });
        } else {
            // DynamoDB: Fetch all users for community, then filter/sort/skip/limit in memory
            let allItems = [];
            let lastEvaluatedKey = undefined;

            try {
                do {
                    const params = {
                        indexName: 'community-index',
                        keyCondition: 'communityId = :communityId',
                        keyValues: { ':communityId': communityId },
                        exclusiveStartKey: lastEvaluatedKey
                    };

                    const result = await this.getDb().query(this.tableName, params);
                    allItems.push(...result.items);
                    lastEvaluatedKey = result.lastEvaluatedKey;
                } while (lastEvaluatedKey);
            } catch (error) {
                console.error(`Error fetching all community users:`, error);
                throw error;
            }

            // 1. Transform
            let processedItems = this._transformResult(allItems);

            // 2. Apply Filters (In-Memory)
            if (options.status) {
                processedItems = processedItems.filter(u => u.communityStatus === options.status);
            } else if (options.communityStatus) {
                processedItems = processedItems.filter(u => u.communityStatus === options.communityStatus);
            }
            if (options.role) {
                processedItems = processedItems.filter(u => u.roleInCommunity === options.role);
            } else if (options.roleInCommunity) {
                processedItems = processedItems.filter(u => u.roleInCommunity === options.roleInCommunity);
            }

            // 3. Apply Sort (Default: createdAt desc)
            processedItems.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateB - dateA;
            });

            // 4. Pagination
            const skip = options.skip || 0;
            const limit = options.limit || processedItems.length;

            return processedItems.slice(skip, skip + limit);
        }
    }

    /**
     * Count users in a community
     * @param {string} communityId 
     * @param {Object} options 
     * @returns {Promise<number>}
     */
    async countByCommunity(communityId, options = {}) {
        if (this.isMongoDB()) {
            const criteria = { community: communityId };
            if (options.status) {
                criteria.communityStatus = options.status;
            } else if (options.communityStatus) {
                criteria.communityStatus = options.communityStatus;
            }
            return this.count(criteria);
        } else {
            const users = await this.findByCommunity(communityId, options);
            return users.length;
        }
    }

    /**
     * Create a new user with automatic code generation
     * @param {Object} userData 
     * @returns {Promise<Object>}
     */
    async create(userData) {
        // Generate user code if not provided
        if (!userData.code) {
            userData.code = this.generateUserCode(userData);
        }

        // Normalize email
        if (userData.email) {
            userData.email = userData.email.toLowerCase().trim();
        }

        if (this.isMongoDB()) {
            return super.create(userData);
        } else {
            return super.create(userData);
        }
    }

    /**
     * Update user's community status
     * @param {string} userId 
     * @param {string} status 
     * @returns {Promise<Object|null>}
     */
    async updateCommunityStatus(userId, status) {
        return this.updateById(userId, { communityStatus: status });
    }

    /**
     * Update user's role in community
     * @param {string} userId 
     * @param {string} role 
     * @param {string} position 
     * @returns {Promise<Object|null>}
     */
    async updateCommunityRole(userId, role, position = null) {
        const updates = { roleInCommunity: role };
        if (position) updates.positionInCommunity = position;
        return this.updateById(userId, updates);
    }

    /**
     * Find user by ID with password
     * @param {string} id
     * @returns {Promise<Object|null>}
     */
    async findByIdWithPassword(id) {
        if (this.isMongoDB()) {
            const Model = this.getDb().getModel(this.entityName);
            return Model.findById(id).select('+password +plainTextPassword').lean();
        } else {
            return this.findById(id);
        }
    }

    /**
     * Find user by email or phone with password
     * @param {string} identifier - Email or phone
     * @returns {Promise<Object|null>}
     */
    async findByCredentials(identifier) {
        // Check if it's an email or phone
        const isEmail = identifier.includes('@');

        if (isEmail) {
            return this.findByEmail(identifier, { includePassword: true });
        } else {
            return this.findByPhone(identifier, { includePassword: true });
        }
    }

    /**
     * Find all admins of a community
     * @param {string} communityId 
     * @returns {Promise<Array<Object>>}
     */
    async findCommunityAdmins(communityId) {
        return this.findByCommunity(communityId, {
            roleInCommunity: 'admin',
            communityStatus: 'approved'
        });
    }



    /**
     * Search users by name
     * @param {string} query 
     * @param {Object} options 
     * @returns {Promise<Array<Object>>}
     */
    async searchByName(query, options = {}) {
        if (this.isMongoDB()) {
            const regex = new RegExp(query, 'i');
            return this.find(
                {
                    $or: [
                        { firstName: regex },
                        { lastName: regex }
                    ]
                },
                options
            );
        } else {
            // DynamoDB: Scan with filter (less efficient but handles all pages)
            const items = await this._scanAll(this.tableName, {
                filterExpression: 'contains(firstName, :query) OR contains(lastName, :query)',
                filterValues: { ':query': query }
            });

            const skip = options.skip || 0;
            const limit = options.limit || items.length;
            return items.slice(skip, skip + limit);
        }
    }
}

// Singleton instance
let userRepositoryInstance = null;

const getUserRepository = () => {
    if (!userRepositoryInstance) {
        userRepositoryInstance = new UserRepository();
    }
    return userRepositoryInstance;
};

module.exports = {
    UserRepository,
    getUserRepository
};
