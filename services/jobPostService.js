// services/jobPostService.js - Job Post Service

const { getJobPostRepository } = require('../repositories/jobPostRepository');

class JobPostService {
    constructor() {
        this.jobPostRepo = getJobPostRepository();
    }

    async createJobPost(jobData, communityId, posterId) {
        return this.jobPostRepo.create({ ...jobData, communityId, postedBy: posterId });
    }

    async getJobPostById(jobId) {
        return this.jobPostRepo.findById(jobId);
    }

    async getJobPostsByCommunity(communityId, options = {}) {
        return this.jobPostRepo.findByCommunity(communityId, options);
    }

    async getActiveJobPosts(communityId) {
        return this.jobPostRepo.findActive(communityId);
    }

    async getJobPostsByPoster(posterId) {
        return this.jobPostRepo.findByPoster(posterId);
    }

    async updateJobPost(jobId, updates) {
        return this.jobPostRepo.updateById(jobId, updates);
    }

    async deleteJobPost(jobId) {
        return this.jobPostRepo.deleteById(jobId);
    }
}

let instance = null;
const getJobPostService = () => {
    if (!instance) instance = new JobPostService();
    return instance;
};

module.exports = { JobPostService, getJobPostService };
