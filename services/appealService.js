// services/appealService.js - Appeal Service

const { getAppealRepository } = require('../repositories/appealRepository');

class AppealService {
    constructor() {
        this.appealRepo = getAppealRepository();
    }

    async createAppeal(appealData, communityId, createdBy) {
        return this.appealRepo.create({ ...appealData, communityId, createdBy, status: 'submitted' });
    }

    async getAppealById(appealId) {
        return this.appealRepo.findById(appealId);
    }

    async getAppealsByCommunity(communityId, options = {}) {
        return this.appealRepo.findByCommunity(communityId, options);
    }

    async getAppealsByUser(userId, options = {}) {
        return this.appealRepo.findByUser(userId, options);
    }

    async getActiveAppeals(communityId) {
        return this.appealRepo.findActive(communityId);
    }

    async updateAppeal(appealId, updates) {
        return this.appealRepo.updateById(appealId, updates);
    }

    async deleteAppeal(appealId) {
        return this.appealRepo.deleteById(appealId);
    }
}

let instance = null;
const getAppealService = () => {
    if (!instance) instance = new AppealService();
    return instance;
};

module.exports = { AppealService, getAppealService };
