// repositories/appealRepository.js - Appeal Repository

const { CommunityEntityRepository } = require('./CommunityEntityRepository');

class AppealRepository extends CommunityEntityRepository {
    constructor() {
        super('Appeal', 'appeals', 'communityId');
    }

    /**
     * Find active appeals
     * @param {string} communityId 
     * @param {Object} options 
     * @returns {Promise<Array<Object>>}
     */
    async findActive(communityId, options = {}) {
        return this.findByCommunity(communityId, {
            ...options,
            filters: { isActive: true }
        });
    }

    /**
     * Find appeals by user
     * @param {string} userId 
     * @param {Object} options 
     * @returns {Promise<Array<Object>>}
     */
    async findByUser(userId, options = {}) {
        if (this.isMongoDB()) {
            return this.find({ user: userId }, options);
        } else {
            // Scan for now, or use index if available. Key Schema is communityId (PK), sk (SK).
            // No userid-index mentioned in dynamo-tables.js for Appeal?
            // Assuming scan is fallback.
            const result = await this.getDb().scan(this.tableName, {
                filterExpression: '#user = :userId',
                filterValues: { ':userId': userId },
                expressionAttributeNames: { '#user': 'user' }, // 'user' might be reserved?
                limit: options.limit
            });
            return result.items;
        }
    }
}

let appealRepositoryInstance = null;
const getAppealRepository = () => {
    if (!appealRepositoryInstance) {
        appealRepositoryInstance = new AppealRepository();
    }
    return appealRepositoryInstance;
};

module.exports = { AppealRepository, getAppealRepository };
