// services/communityService.js - Community Service
// Handles community-related business logic

const { getCommunityRepository } = require('../repositories/communityRepository');
const { getCommunityConfigRepository } = require('../repositories/communityConfigRepository');
const { getUserRepository } = require('../repositories/userRepository');

class CommunityService {
    constructor() {
        this.communityRepo = getCommunityRepository();
        this.configRepo = getCommunityConfigRepository();
        this.userRepo = getUserRepository();
    }

    /**
     * Create a new community
     */
    async createCommunity(communityData, createdBy) {
        const community = await this.communityRepo.create({
            ...communityData,
            createdBy,
        });

        // Create default configuration
        await this.configRepo.create({
            community: community._id || community.id,
        });

        return community;
    }

    /**
     * Get community by ID
     */
    async getCommunityById(communityId) {
        return this.communityRepo.findByIdWithConfig(communityId);
    }

    /**
     * Get community by code
     */
    async getCommunityByCode(code) {
        return this.communityRepo.findByCode(code);
    }

    /**
     * Update community
     */
    async updateCommunity(communityId, updates) {
        return this.communityRepo.updateById(communityId, updates);
    }

    /**
     * Update community configuration
     */
    /**
     * Update community configuration
     */
    async updateCommunityConfig(communityId, configUpdates) {
        return this.configRepo.upsert(communityId, configUpdates);
    }

    /**
     * Get community configuration
     */
    async getCommunityConfig(communityId) {
        return this.configRepo.findByCommunityId(communityId);
    }

    /**
     * Get all communities
     */
    async getAllCommunities(options = {}) {
        return this.communityRepo.findAll(options);
    }

    /**
     * Delete community
     */
    async deleteCommunity(communityId) {
        // Delete associated config
        await this.configRepo.deleteByCommunityId(communityId);
        return this.communityRepo.deleteById(communityId);
    }

    /**
     * Get community members
     */
    async getCommunityMembers(communityId, options = {}) {
        return this.userRepo.findByCommunity(communityId, options);
    }

    /**
     * Get community stats
     */
    async getCommunityStats(communityId) {
        const [totalMembers, pendingMembers, approvedMembers] = await Promise.all([
            this.userRepo.countByCommunity(communityId),
            this.userRepo.countByCommunity(communityId, { communityStatus: 'pending' }),
            this.userRepo.countByCommunity(communityId, { communityStatus: 'approved' }),
        ]);

        return { totalMembers, pendingMembers, approvedMembers };
    }

    /**
     * Get multiple communities by IDs
     */
    async getManyCommunitiesByIds(ids) {
        if (!ids || ids.length === 0) return [];
        return this.communityRepo.getManyByIds(ids);
    }
}

let communityServiceInstance = null;

const getCommunityService = () => {
    if (!communityServiceInstance) {
        communityServiceInstance = new CommunityService();
    }
    return communityServiceInstance;
};

module.exports = { CommunityService, getCommunityService };
