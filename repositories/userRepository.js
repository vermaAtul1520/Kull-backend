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
        if (this.isMongoDB()) {
            const Model = this.getDb().getModel(this.entityName);
            let query = Model.findOne({ email: email.toLowerCase() });

            if (options.includePassword) {
                query = query.select('+password +plainTextPassword');
            }
            if (options.populate) {
                query = query.populate(options.populate);
            }

            return query.lean();
        } else {
            const result = await this.getDb().query(this.tableName, {
                indexName: 'email-index',
                keyCondition: 'email = :email',
                keyValues: { ':email': email.toLowerCase() },
                limit: 1
            });
            return result.items[0] || null;
        }
    }

    /**
     * Find user by phone
     * @param {string} phone 
     * @param {Object} options 
     * @returns {Promise<Object|null>}
     */
    async findByPhone(phone, options = {}) {
        if (this.isMongoDB()) {
            const Model = this.getDb().getModel(this.entityName);
            let query = Model.findOne({ phone });

            if (options.includePassword) {
                query = query.select('+password +plainTextPassword');
            }
            if (options.populate) {
                query = query.populate(options.populate);
            }

            return query.lean();
        } else {
            const result = await this.getDb().query(this.tableName, {
                indexName: 'phone-index',
                keyCondition: 'phone = :phone',
                keyValues: { ':phone': phone },
                limit: 1
            });
            return result.items[0] || null;
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
            }
            if (options.role) {
                criteria.roleInCommunity = options.role;
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

            if (options.status) {
                filterExpression = 'communityStatus = :status';
                filterValues[':status'] = options.status;
            }
            if (options.role) {
                filterExpression = filterExpression
                    ? `${filterExpression} AND roleInCommunity = :role`
                    : 'roleInCommunity = :role';
                filterValues[':role'] = options.role;
            }

            const expressionAttributeNames = {};
            if (options.status) expressionAttributeNames['#status'] = 'communityStatus';
            if (options.role) expressionAttributeNames['#role'] = 'roleInCommunity';

            const result = await this.getDb().query(this.tableName, {
                indexName: 'community-index',
                keyCondition: 'communityId = :communityId',
                keyValues: { ':communityId': communityId },
                filterExpression: filterExpression ? filterExpression.replace('communityStatus', '#status').replace('roleInCommunity', '#role') : undefined,
                filterValues: Object.keys(filterValues).length > 0 ? filterValues : undefined,
                expressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
                limit: options.limit,
                scanForward: false // Newest first
            });

            return result.items;
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
            if (options.status) criteria.communityStatus = options.status;
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
            // For DynamoDB, convert community ObjectId to string
            if (userData.community && typeof userData.community === 'object') {
                userData.communityId = userData.community.toString();
                delete userData.community;
            } else if (userData.community) {
                userData.communityId = userData.community;
                delete userData.community;
            }

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
            // DynamoDB: Scan with filter (less efficient)
            const result = await this.getDb().scan(this.tableName, {
                filterExpression: 'contains(firstName, :query) OR contains(lastName, :query)',
                filterValues: { ':query': query },
                limit: options.limit
            });
            return result.items;
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
