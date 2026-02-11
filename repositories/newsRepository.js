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
            const result = await this.getDb().scan(this.tableName, {
                filterExpression: 'authorId = :authorId',
                filterValues: { ':authorId': authorId },
                limit: options.limit
            });
            return result.items;
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
