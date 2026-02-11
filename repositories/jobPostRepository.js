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
            const result = await this.getDb().scan(this.tableName, {
                filterExpression: 'postedById = :posterId',
                filterValues: { ':posterId': posterId },
                limit: options.limit
            });
            return result.items;
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
