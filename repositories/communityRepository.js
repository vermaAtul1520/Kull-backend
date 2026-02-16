// repositories/communityRepository.js - Community Repository
// Handles all Community CRUD operations for both MongoDB and DynamoDB

const { BaseRepository } = require('./BaseRepository');

class CommunityRepository extends BaseRepository {
    constructor() {
        super('Community', 'communities');
    }

    /**
     * Generate community code (replicated from Mongoose pre-save hook)
     * @param {Object} communityData 
     * @returns {string}
     */
    generateCommunityCode(communityData) {
        // Take first 2 letters from community name
        let namePrefix = communityData.name.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();

        if (namePrefix.length < 2) {
            const allLetters = communityData.name.replace(/[^a-zA-Z]/g, '').toUpperCase();
            if (allLetters.length >= 2) {
                namePrefix = allLetters.slice(0, 2);
            } else if (allLetters.length === 1) {
                namePrefix = allLetters + 'C';
            } else {
                namePrefix = 'CM';
            }
        }

        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const specialChars = '!@#$%&*';

        let randomPart = '';
        for (let i = 0; i < 6; i++) {
            randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        let specialPart = '';
        for (let i = 0; i < 2; i++) {
            specialPart += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
        }

        const timestamp = Date.now().toString(36).slice(-2).toUpperCase();
        const codeParts = (namePrefix + randomPart + specialPart + timestamp).split('');

        // Shuffle middle section
        for (let i = 2; i < codeParts.length - 2; i++) {
            const j = 2 + Math.floor(Math.random() * (codeParts.length - 4));
            [codeParts[i], codeParts[j]] = [codeParts[j], codeParts[i]];
        }

        return codeParts.join('');
    }

    /**
     * Find community by code
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
     * Find community by name
     * @param {string} name 
     * @returns {Promise<Object|null>}
     */
    async findByName(name) {
        if (this.isMongoDB()) {
            return this.findOne({ name });
        } else {
            const result = await this.getDb().query(this.tableName, {
                indexName: 'name-index',
                keyCondition: 'name = :name',
                keyValues: { ':name': name },
                limit: 1
            });
            return result.items[0] || null;
        }
    }

    /**
     * Create a new community with automatic code generation
     * @param {Object} communityData 
     * @returns {Promise<Object>}
     */
    async create(communityData) {
        // Generate code if not provided
        if (!communityData.code) {
            communityData.code = this.generateCommunityCode(communityData);
        }

        if (this.isMongoDB()) {
            return super.create(communityData);
        } else {
            // For DynamoDB, convert createdBy ObjectId to string
            if (communityData.createdBy && typeof communityData.createdBy === 'object') {
                communityData.createdBy = communityData.createdBy.toString();
            }
            return super.create(communityData);
        }
    }

    /**
     * Get community with configuration
     * @param {string} communityId 
     * @returns {Promise<Object|null>}
     */
    async findByIdWithConfig(communityId) {
        if (this.isMongoDB()) {
            return this.findById(communityId, {
                populate: 'communityConfiguration'
            });
        } else {
            const community = await this.findById(communityId);
            if (!community) return null;

            // Fetch configuration separately
            const config = await this.getDb().getItem('community-config', {
                communityId: communityId
            });

            return {
                ...community,
                communityConfiguration: config
            };
        }
    }

    /**
     * Get all communities with pagination
     * @param {Object} options - { skip, limit, sort }
     * @returns {Promise<Array<Object>>}
     */
    async findAll(options = {}) {
        return this.find({}, options);
    }

    /**
     * Search communities by name
     * @param {string} query 
     * @param {Object} options 
     * @returns {Promise<Array<Object>>}
     */
    async searchByName(query, options = {}) {
        if (this.isMongoDB()) {
            const regex = new RegExp(query, 'i');
            return this.find({ name: regex }, options);
        } else {
            const items = await this._scanAll(this.tableName, {
                filterExpression: 'contains(#name, :query)',
                filterValues: { ':query': query },
                expressionAttributeNames: { '#name': 'name' }
            });

            const skip = options.skip || 0;
            const limit = options.limit || items.length;
            return items.slice(skip, skip + limit);
        }
    }

    /**
     * Check if community name is unique
     * @param {string} name 
     * @param {string} excludeId - Exclude this community from check
     * @returns {Promise<boolean>}
     */
    async isNameUnique(name, excludeId = null) {
        const existing = await this.findByName(name);
        if (!existing) return true;
        if (excludeId && existing.id === excludeId) return true;
        if (excludeId && existing._id && existing._id.toString() === excludeId) return true;
        return false;
    }
}

// Singleton instance
let communityRepositoryInstance = null;

const getCommunityRepository = () => {
    if (!communityRepositoryInstance) {
        communityRepositoryInstance = new CommunityRepository();
    }
    return communityRepositoryInstance;
};

module.exports = {
    CommunityRepository,
    getCommunityRepository
};
