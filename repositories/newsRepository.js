// repositories/newsRepository.js - News Repository

const { CommunityEntityRepository } = require('./CommunityEntityRepository');

class NewsRepository extends CommunityEntityRepository {
    constructor() {
        super('News', 'news', 'communityId');
    }

    /**
     * Find published news
     * @param {string} communityId 
     * @param {Object} options 
     * @returns {Promise<Array<Object>>}
     */
    async findPublished(communityId, options = {}) {
        return this.findByCommunity(communityId, {
            ...options,
            filters: { isPublished: true }
        });
    }

    /**
     * Find news by author
     * @param {string} authorId 
     * @param {Object} options 
     * @returns {Promise<Array<Object>>}
     */
    async findByAuthor(authorId, options = {}) {
        if (this.isMongoDB()) {
            return this.find({ author: authorId }, options);
        } else {
            const items = await this._scanAll(this.tableName, {
                filterExpression: 'authorId = :authorId',
                filterValues: { ':authorId': authorId }
            });

            const skip = options.skip || 0;
            const limit = options.limit || items.length;
            return items.slice(skip, skip + limit);
        }
    }
}

let newsRepositoryInstance = null;
const getNewsRepository = () => {
    if (!newsRepositoryInstance) {
        newsRepositoryInstance = new NewsRepository();
    }
    return newsRepositoryInstance;
};

module.exports = { NewsRepository, getNewsRepository };
