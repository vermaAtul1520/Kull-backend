// repositories/donationRepository.js - Donation Repository

const { CommunityEntityRepository } = require('./CommunityEntityRepository');

class DonationRepository extends CommunityEntityRepository {
    constructor() {
        super('Donation', 'donations', 'communityId');
    }

    /**
     * Find donations by urgency level
     * @param {string} communityId 
     * @param {string} urgency - 'Low', 'Medium', 'High'
     * @returns {Promise<Array<Object>>}
     */
    async findByUrgency(communityId, urgency) {
        return this.findByCommunity(communityId, {
            filters: { urgency }
        });
    }

    /**
     * Find donations by category
     * @param {string} communityId 
     * @param {string} category 
     * @returns {Promise<Array<Object>>}
     */
    async findByCategory(communityId, category) {
        return this.findByCommunity(communityId, {
            filters: { category }
        });
    }
}

let donationRepositoryInstance = null;
const getDonationRepository = () => {
    if (!donationRepositoryInstance) {
        donationRepositoryInstance = new DonationRepository();
    }
    return donationRepositoryInstance;
};

module.exports = { DonationRepository, getDonationRepository };
