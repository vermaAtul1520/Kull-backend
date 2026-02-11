// services/bhajanService.js - Bhajan Service

const { getBhajanRepository } = require('../repositories/bhajanRepository');

class BhajanService {
    constructor() {
        this.bhajanRepo = getBhajanRepository();
    }

    async createBhajan(bhajanData, communityId, createdBy) {
        return this.bhajanRepo.create({ ...bhajanData, communityId, createdBy });
    }

    async getBhajanById(bhajanId) {
        return this.bhajanRepo.findById(bhajanId);
    }

    async getBhajansByCommunity(communityId, options = {}) {
        return this.bhajanRepo.findByCommunity(communityId, options);
    }

    async getBhajansByCategory(communityId, category) {
        return this.bhajanRepo.findByCategory(communityId, category);
    }

    async searchBhajans(communityId, searchTerm) {
        return this.bhajanRepo.searchByTitle(communityId, searchTerm);
    }

    async updateBhajan(bhajanId, updates) {
        return this.bhajanRepo.updateById(bhajanId, updates);
    }

    async deleteBhajan(bhajanId) {
        return this.bhajanRepo.deleteById(bhajanId);
    }
}

let instance = null;
const getBhajanService = () => {
    if (!instance) instance = new BhajanService();
    return instance;
};

module.exports = { BhajanService, getBhajanService };
