// services/donationService.js - Donation Service

const { getDonationRepository } = require('../repositories/donationRepository');

class DonationService {
    constructor() {
        this.donationRepo = getDonationRepository();
    }

    async createDonation(donationData, communityId, createdBy) {
        return this.donationRepo.create({
            ...donationData,
            communityId,
            createdBy,
        });
    }

    async getDonationById(donationId) {
        return this.donationRepo.findById(donationId);
    }

    async getDonationsByCommunity(communityId, options = {}) {
        return this.donationRepo.findByCommunity(communityId, options);
    }

    async updateDonation(donationId, updates) {
        return this.donationRepo.updateById(donationId, updates);
    }

    async deleteDonation(donationId) {
        return this.donationRepo.deleteById(donationId);
    }
}

let instance = null;
const getDonationService = () => {
    if (!instance) instance = new DonationService();
    return instance;
};

module.exports = { DonationService, getDonationService };
