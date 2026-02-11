// services/occasionService.js - Occasion Service

const { getOccasionRepository } = require('../repositories/occasionRepository');
const { getOccasionCategoryRepository } = require('../repositories/occasionCategoryRepository');
const { getOccasionContentRepository } = require('../repositories/occasionContentRepository');

class OccasionService {
    constructor() {
        this.occasionRepo = getOccasionRepository();
        this.contentRepo = getOccasionContentRepository();
        this.occasionCategoryRepo = getOccasionCategoryRepository();
    }

    // Occasion Category Methods
    async createCategory(data) {
        return this.occasionCategoryRepo.create(data);
    }

    async getCategoriesByCommunity(communityId, options = {}) {
        return this.occasionCategoryRepo.findByCommunity(communityId, options);
    }

    async getCategoryById(id) {
        return this.occasionCategoryRepo.findById(id);
    }

    async updateCategory(id, updates) {
        // Validation for uniqueness might be needed here or in controller
        return this.occasionCategoryRepo.updateById(id, updates);
    }

    async deleteCategory(id) {
        return this.occasionCategoryRepo.deleteById(id);
    }

    // Check availability
    async checkCategoryNameExists(name, occasionType, communityId, excludeId = null) {
        const existing = await this.occasionCategoryRepo.findByNameAndType(name, occasionType, communityId);
        if (!existing) return false;
        if (excludeId && (existing.id === excludeId || existing._id.toString() === excludeId)) return false;
        return true;
    }

    async createOccasion(occasionData, communityId, createdBy) {
        return this.occasionRepo.create({
            ...occasionData,
            communityId,
            createdBy,
        });
    }

    async getOccasionById(occasionId) {
        return this.occasionRepo.findById(occasionId);
    }

    async getOccasionsByCommunity(communityId, options = {}) {
        return this.occasionRepo.findByCommunity(communityId, options);
    }

    async getUpcomingOccasions(communityId, options = {}) {
        return this.occasionRepo.findUpcoming(communityId, options);
    }

    async getOccasionsByCategory(categoryId, options = {}) {
        return this.occasionRepo.findByCategory(categoryId, options);
    }

    async updateOccasion(occasionId, updates) {
        return this.occasionRepo.updateById(occasionId, updates);
    }

    async deleteOccasion(occasionId) {
        return this.occasionRepo.deleteById(occasionId);
    }

    // Content methods
    async createContent(contentData, occasionId) {
        return this.contentRepo.create({ ...contentData, occasion: occasionId });
    }

    async addContents(contents, occasionId) {
        const docs = contents.map(c => ({ ...c, occasion: occasionId }));
        return this.contentRepo.insertMany(docs);
    }

    async getContentsByOccasion(occasionId) {
        return this.contentRepo.findByOccasion(occasionId);
    }
}

let instance = null;
const getOccasionService = () => {
    if (!instance) instance = new OccasionService();
    return instance;
};

module.exports = { OccasionService, getOccasionService };
