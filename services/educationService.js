// services/educationService.js - Education Resource Service

const { getEducationRepository } = require('../repositories/educationRepository');

class EducationService {
    constructor() {
        this.educationRepo = getEducationRepository();
    }

    async createResource(resourceData, communityId, createdBy) {
        return this.educationRepo.create({ ...resourceData, communityId, createdBy });
    }

    async getResourceById(resourceId) {
        return this.educationRepo.findById(resourceId);
    }

    async getResourcesByCommunity(communityId, options = {}) {
        return this.educationRepo.findByCommunity(communityId, options);
    }

    async getResourcesByType(communityId, resourceType) {
        return this.educationRepo.findByType(communityId, resourceType);
    }

    async updateResource(resourceId, updates) {
        return this.educationRepo.updateById(resourceId, updates);
    }

    async deleteResource(resourceId) {
        return this.educationRepo.deleteById(resourceId);
    }
}

let instance = null;
const getEducationService = () => {
    if (!instance) instance = new EducationService();
    return instance;
};

module.exports = { EducationService, getEducationService };
