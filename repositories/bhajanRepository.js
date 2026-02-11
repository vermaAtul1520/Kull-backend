// repositories/bhajanRepository.js - Bhajan Repository

const { CommunityEntityRepository } = require('./CommunityEntityRepository');

class BhajanRepository extends CommunityEntityRepository {
    constructor() {
        super('Bhajan', 'bhajans', 'communityId');
    }

    /**
     * Find bhajans by category
     * @param {string} communityId 
     * @param {string} category 
     * @returns {Promise<Array<Object>>}
     */
    async findByCategory(communityId, category) {
        return this.findByCommunity(communityId, {
            filters: { category }
        });
    }

    /**
     * Search bhajans by title
     * @param {string} communityId 
     * @param {string} query 
     * @returns {Promise<Array<Object>>}
     */
    async searchByTitle(communityId, query) {
        if (this.isMongoDB()) {
            const regex = new RegExp(query, 'i');
            return this.find({
                communityId,
                title: regex
            });
        } else {
            const result = await this.getDb().query(this.tableName, {
                keyCondition: 'communityId = :communityId',
                keyValues: { ':communityId': communityId },
                filterExpression: 'contains(title, :query)',
                filterValues: { ':query': query }
            });
            return result.items;
        }
    }
}

let bhajanRepositoryInstance = null;
const getBhajanRepository = () => {
    if (!bhajanRepositoryInstance) {
        bhajanRepositoryInstance = new BhajanRepository();
    }
    return bhajanRepositoryInstance;
};

module.exports = { BhajanRepository, getBhajanRepository };
