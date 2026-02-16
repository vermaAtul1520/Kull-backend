// repositories/jobPostRepository.js - Job Post Repository

const { CommunityEntityRepository } = require('./CommunityEntityRepository');

class JobPostRepository extends CommunityEntityRepository {
    constructor() {
        super('JobPost', 'jobs', 'communityId');
    }

    /**
     * Find active job posts
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
     * Find jobs by poster
     * @param {string} posterId 
     * @param {Object} options 
     * @returns {Promise<Array<Object>>}
     */
    async findByPoster(posterId, options = {}) {
        if (this.isMongoDB()) {
            return this.find({ postedBy: posterId }, options);
        } else {
            const items = await this._scanAll(this.tableName, {
                filterExpression: 'postedById = :posterId',
                filterValues: { ':posterId': posterId }
            });

            const skip = options.skip || 0;
            const limit = options.limit || items.length;
            return items.slice(skip, skip + limit);
        }
    }
}

let jobPostRepositoryInstance = null;
const getJobPostRepository = () => {
    if (!jobPostRepositoryInstance) {
        jobPostRepositoryInstance = new JobPostRepository();
    }
    return jobPostRepositoryInstance;
};

module.exports = { JobPostRepository, getJobPostRepository };
