// repositories/dukaanRepository.js - Dukaan (Shop) Repository

const { CommunityEntityRepository } = require('./CommunityEntityRepository');

class DukaanRepository extends CommunityEntityRepository {
    constructor() {
        super('Dukaan', 'dukaans', 'communityId');
    }

    /**
     * Find dukaans by category
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
     * Find dukaans by owner
     * @param {string} ownerId 
     * @param {Object} options 
     * @returns {Promise<Array<Object>>}
     */
    async findByOwner(ownerId, options = {}) {
        if (this.isMongoDB()) {
            return this.find({ owner: ownerId }, options);
        } else {
            const result = await this.getDb().scan(this.tableName, {
                filterExpression: 'ownerId = :ownerId',
                filterValues: { ':ownerId': ownerId },
                limit: options.limit
            });
            return result.items;
        }
    }

    /**
     * Search dukaans by name
     * @param {string} communityId 
     * @param {string} query 
     * @returns {Promise<Array<Object>>}
     */
    async searchByName(communityId, query) {
        if (this.isMongoDB()) {
            const regex = new RegExp(query, 'i');
            return this.find({
                communityId,
                name: regex
            });
        } else {
            const result = await this.getDb().query(this.tableName, {
                keyCondition: 'communityId = :communityId',
                keyValues: { ':communityId': communityId },
                filterExpression: 'contains(#name, :query)',
                filterValues: { ':query': query }
            });
            return result.items;
        }
    }
}

let dukaanRepositoryInstance = null;
const getDukaanRepository = () => {
    if (!dukaanRepositoryInstance) {
        dukaanRepositoryInstance = new DukaanRepository();
    }
    return dukaanRepositoryInstance;
};

module.exports = { DukaanRepository, getDukaanRepository };
