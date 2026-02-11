// services/dukaanService.js - Dukaan (Shop) Service

const { getDukaanRepository } = require('../repositories/dukaanRepository');

class DukaanService {
    constructor() {
        this.dukaanRepo = getDukaanRepository();
    }

    async createDukaan(dukaanData, communityId, ownerId) {
        return this.dukaanRepo.create({ ...dukaanData, communityId, owner: ownerId });
    }

    async getDukaanById(dukaanId) {
        return this.dukaanRepo.findById(dukaanId);
    }

    async getDukaansByCommunity(communityId, options = {}) {
        return this.dukaanRepo.findByCommunity(communityId, options);
    }

    async getDukaansByCategory(communityId, category) {
        return this.dukaanRepo.findByCategory(communityId, category);
    }

    async getDukaansByOwner(ownerId) {
        return this.dukaanRepo.findByOwner(ownerId);
    }

    async searchDukaans(communityId, searchTerm) {
        return this.dukaanRepo.searchByName(communityId, searchTerm);
    }

    async updateDukaan(dukaanId, updates) {
        return this.dukaanRepo.updateById(dukaanId, updates);
    }

    async deleteDukaan(dukaanId) {
        return this.dukaanRepo.deleteById(dukaanId);
    }
}

let instance = null;
const getDukaanService = () => {
    if (!instance) instance = new DukaanService();
    return instance;
};

module.exports = { DukaanService, getDukaanService };
