// services/kartavyaService.js - Kartavya Service

const { getKartavyaRepository } = require('../repositories/kartavyaRepository');

class KartavyaService {
    constructor() {
        this.kartavyaRepo = getKartavyaRepository();
    }

    async createKartavya(kartavyaData, communityId, createdBy) {
        return this.kartavyaRepo.create({ ...kartavyaData, community: communityId, createdBy });
    }

    async getKartavyaById(kartavyaId) {
        return this.kartavyaRepo.findById(kartavyaId);
    }

    async getKartavyaByCommunity(communityId, options = {}) {
        return this.kartavyaRepo.findByCommunity(communityId, options);
    }

    async updateKartavya(kartavyaId, updates) {
        return this.kartavyaRepo.updateById(kartavyaId, updates);
    }

    async deleteKartavya(kartavyaId) {
        return this.kartavyaRepo.deleteById(kartavyaId);
    }
}

let instance = null;
const getKartavyaService = () => {
    if (!instance) instance = new KartavyaService();
    return instance;
};

module.exports = { KartavyaService, getKartavyaService };
