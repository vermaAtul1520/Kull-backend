// repositories/communityConfigRepository.js - Community Configuration Repository
// Handles Community Configuration CRUD operations

const { BaseRepository } = require('./BaseRepository');

class CommunityConfigRepository extends BaseRepository {
    constructor() {
        super('CommunityConfiguration', 'community-config');
    }

    /**
     * Override create to map 'community' field to 'communityId' partition key for DynamoDB
     */
    async create(data) {
        if (this.isMongoDB()) {
            return super.create(data);
        } else {
            // DynamoDB table uses 'communityId' as partition key
            if (data.community && !data.communityId) {
                data.communityId = data.community;
            }
            if (!data.communityId) {
                throw new Error('communityId is required to create community config');
            }

            // Remove auto-generated 'id' — communityId is the primary key
            delete data.id;

            // Default values (mimicking Mongoose Schema)
            if (!data.drorOption) {
                data.drorOption = {
                    occasions: { visible: true, label: "Occasions", labelHindi: "अवसर" },
                    kartavya: { visible: true, label: "Kartavya", labelHindi: "कर्तव्य" },
                    bhajan: { visible: true, label: "Bhajan", labelHindi: "भजन" },
                    games: { visible: true, label: "Games", labelHindi: "खेल" },
                    citySearch: { visible: true, label: "City Search", labelHindi: "शहर खोज" },
                    organizationOfficer: { visible: true, label: "Organization Officer", labelHindi: "संगठन अधिकारी" },
                    education: { visible: true, label: "Education", labelHindi: "शिक्षा" },
                    employment: { visible: true, label: "Employment", labelHindi: "रोजगार" },
                    sports: { visible: true, label: "Sports", labelHindi: "खेल-कूद" },
                    dukan: { visible: true, label: "Dukan", labelHindi: "दुकान" },
                    meetings: { visible: true, label: "Meetings", labelHindi: "बैठकें" },
                    appeal: { visible: true, label: "Appeal", labelHindi: "अपील" },
                    vote: { visible: true, label: "Vote", labelHindi: "मतदान" },
                    familyTree: { visible: true, label: "Family Tree", labelHindi: "वंश वृक्ष" }
                };
            }
            if (!data.banner) data.banner = [];
            if (!data.smaajKeTaaj) data.smaajKeTaaj = [];
            if (!data.gotra) data.gotra = [];

            const now = new Date().toISOString();
            if (!data.createdAt) data.createdAt = now;
            data.updatedAt = now;
            const result = await this.getDb().putItem(this.tableName, data);
            return this._transformResult(result);
        }
    }

    /**
     * Inner helper to merge drorOption fields
     */
    _prepareUpdateData(existing, updates) {
        const merged = { ...updates };
        if (updates.drorOption && existing && existing.drorOption) {
            merged.drorOption = {
                ...existing.drorOption,
                ...updates.drorOption
            };
        }
        return merged;
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
            const result = await this.getDb().getItem(this.tableName, { communityId });
            return this._transformResult(result);
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
                const mergedData = this._prepareUpdateData(existing, configData);
                return this.getDb().updateItem(this.tableName, { communityId }, mergedData);
            } else {
                // If creating new, ensure we have defaults
                const data = { communityId, ...configData };
                if (!data.drorOption) {
                    data.drorOption = {
                        occasions: { visible: true, label: "Occasions", labelHindi: "अवसर" },
                        kartavya: { visible: true, label: "Kartavya", labelHindi: "कर्तव्य" },
                        bhajan: { visible: true, label: "Bhajan", labelHindi: "भजन" },
                        games: { visible: true, label: "Games", labelHindi: "खेल" },
                        citySearch: { visible: true, label: "City Search", labelHindi: "शहर खोज" },
                        organizationOfficer: { visible: true, label: "Organization Officer", labelHindi: "संगठन अधिकारी" },
                        education: { visible: true, label: "Education", labelHindi: "शिक्षा" },
                        employment: { visible: true, label: "Employment", labelHindi: "रोजगार" },
                        sports: { visible: true, label: "Sports", labelHindi: "खेल-कूद" },
                        dukan: { visible: true, label: "Dukan", labelHindi: "दुकान" },
                        meetings: { visible: true, label: "Meetings", labelHindi: "बैठकें" },
                        appeal: { visible: true, label: "Appeal", labelHindi: "अपील" },
                        vote: { visible: true, label: "Vote", labelHindi: "मतदान" },
                        familyTree: { visible: true, label: "Family Tree", labelHindi: "वंश वृक्ष" }
                    };
                }
                return this.getDb().putItem(this.tableName, data);
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
            const existing = await this.findByCommunityId(communityId);
            const mergedUpdates = this._prepareUpdateData(existing, updates);
            return this.getDb().updateItem(this.tableName, { communityId }, mergedUpdates);
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

    /**
     * Map communityId to id and enforce drawer order for frontend consistency
     */
    _transformResult(result) {
        if (!result) return null;
        if (Array.isArray(result)) {
            return result.map(item => this._transformResult(item));
        }

        const item = { ...result };

        // Enforce drawer order
        if (item.drorOption) {
            const ORDERED_KEYS = [
                'occasions', 'kartavya', 'bhajan', 'games', 'citySearch',
                'organizationOfficer', 'education', 'employment', 'sports',
                'dukan', 'meetings', 'appeal', 'vote', 'familyTree'
            ];
            const reordered = {};
            ORDERED_KEYS.forEach(key => {
                if (item.drorOption[key]) {
                    reordered[key] = item.drorOption[key];
                }
            });
            // Append any unknown keys at the end
            Object.keys(item.drorOption).forEach(key => {
                if (!reordered[key]) reordered[key] = item.drorOption[key];
            });
            item.drorOption = reordered;
        }

        if (item.id === undefined) {
            item.id = item.communityId;
        }
        return item;
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
