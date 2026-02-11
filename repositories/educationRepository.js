// repositories/educationRepository.js - Education Resource Repository

const { CommunityEntityRepository } = require('./CommunityEntityRepository');

class EducationRepository extends CommunityEntityRepository {
    constructor() {
        super('EducationResource', 'education', 'communityId');
    }

    /**
     * Find resources by type
     * @param {string} communityId 
     * @param {string} resourceType 
     * @returns {Promise<Array<Object>>}
     */
    async findByType(communityId, resourceType) {
        return this.findByCommunity(communityId, {
            filters: { resourceType }
        });
    }
}

let educationRepositoryInstance = null;
const getEducationRepository = () => {
    if (!educationRepositoryInstance) {
        educationRepositoryInstance = new EducationRepository();
    }
    return educationRepositoryInstance;
};

module.exports = { EducationRepository, getEducationRepository };
