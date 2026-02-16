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
            const items = await this._scanAll(this.tableName, {
                filterExpression: '#user = :userId',
                filterValues: { ':userId': userId },
                expressionAttributeNames: { '#user': 'user' }
            });

            const skip = options.skip || 0;
            const limit = options.limit || items.length;
            return items.slice(skip, skip + limit);
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
