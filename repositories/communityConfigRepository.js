// repositories/communityConfigRepository.js - Community Configuration Repository
// Handles Community Configuration CRUD operations

const { BaseRepository } = require('./BaseRepository');

class CommunityConfigRepository extends BaseRepository {
    constructor() {
        super('CommunityConfiguration', 'community-config');
    }

    /**
     * Find configuration by community ID
     * @param {string} communityId 
     * @returns {Promise<Object|null>}
     */
    async findByCommunityId(communityId) {
        if (this.isMongoDB()) {
            return this.findOne({ community: communityId });
        } else {
            return this.getDb().getItem(this.tableName, { communityId });
        }
    }

    /**
     * Create or update configuration for a community
     * @param {string} communityId 
     * @param {Object} configData 
     * @returns {Promise<Object>}
     */
    async upsert(communityId, configData) {
        if (this.isMongoDB()) {
            const Model = this.getDb().getModel(this.entityName);
            return Model.findOneAndUpdate(
                { community: communityId },
                { ...configData, community: communityId },
                { new: true, upsert: true, runValidators: true }
            ).lean();
        } else {
            const existing = await this.findByCommunityId(communityId);
            if (existing) {
                return this.getDb().updateItem(this.tableName, { communityId }, configData);
            } else {
                return this.getDb().putItem(this.tableName, {
                    communityId,
                    ...configData
                });
            }
        }
    }

    /**
     * Update specific configuration fields
     * @param {string} communityId 
     * @param {Object} updates 
     * @returns {Promise<Object|null>}
     */
    async updateConfig(communityId, updates) {
        if (this.isMongoDB()) {
            return this.updateOne({ community: communityId }, updates);
        } else {
            return this.getDb().updateItem(this.tableName, { communityId }, updates);
        }
    }

    /**
     * Update drawer options
     * @param {string} communityId 
     * @param {Object} drorOption 
     * @returns {Promise<Object|null>}
     */
    async updateDrawerOptions(communityId, drorOption) {
        return this.updateConfig(communityId, { drorOption });
    }

    /**
     * Update gotra configuration
     * @param {string} communityId 
     * @param {Array} gotra 
     * @returns {Promise<Object|null>}
     */
    async updateGotra(communityId, gotra) {
        return this.updateConfig(communityId, { gotra });
    }

    /**
     * Update banner configuration
     * @param {string} communityId 
     * @param {Array} banner 
     * @returns {Promise<Object|null>}
     */
    async updateBanner(communityId, banner) {
        return this.updateConfig(communityId, { banner });
    }

    /**
     * Delete configuration for a community
     * @param {string} communityId 
     * @returns {Promise<boolean>}
     */
    async deleteByCommunityId(communityId) {
        if (this.isMongoDB()) {
            return this.deleteOne({ community: communityId });
        } else {
            return this.getDb().deleteItem(this.tableName, { communityId });
        }
    }
}

// Singleton instance
let configRepositoryInstance = null;

const getCommunityConfigRepository = () => {
    if (!configRepositoryInstance) {
        configRepositoryInstance = new CommunityConfigRepository();
    }
    return configRepositoryInstance;
};

module.exports = {
    CommunityConfigRepository,
    getCommunityConfigRepository
};
