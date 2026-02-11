// repositories/occasionRepository.js - Occasion Repository

const { CommunityEntityRepository } = require('./CommunityEntityRepository');
const { generateSortKey } = require('../db/schemas/dynamodb-tables');

class OccasionRepository extends CommunityEntityRepository {
    constructor() {
        super('Occasion', 'occasions', 'communityId');
    }

    /**
     * Find occasions by category
     * @param {string} categoryId 
     * @param {Object} options 
     * @returns {Promise<Array<Object>>}
     */
    async findByCategory(categoryId, options = {}) {
        if (this.isMongoDB()) {
            return this.find({ category: categoryId }, options);
        } else {
            const result = await this.getDb().query(this.tableName, {
                indexName: 'category-index',
                keyCondition: 'categoryId = :categoryId',
                keyValues: { ':categoryId': categoryId },
                limit: options.limit,
                scanForward: false
            });
            return result.items;
        }
    }

    /**
     * Find occasions within date range
     * @param {string} communityId 
     * @param {Date} startDate 
     * @param {Date} endDate 
     * @returns {Promise<Array<Object>>}
     */
    async findByDateRange(communityId, startDate, endDate) {
        if (this.isMongoDB()) {
            return this.find({
                communityId,
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            });
        } else {
            const startSk = generateSortKey(startDate, '');
            const endSk = generateSortKey(endDate, 'zzzzzzzz');

            const result = await this.getDb().query(this.tableName, {
                keyCondition: 'communityId = :communityId AND sk BETWEEN :startSk AND :endSk',
                keyValues: {
                    ':communityId': communityId,
                    ':startSk': startSk,
                    ':endSk': endSk
                }
            });
            return result.items;
        }
    }

    /**
     * Find upcoming occasions
     * @param {string} communityId 
     * @param {Object} options 
     * @returns {Promise<Array<Object>>}
     */
    async findUpcoming(communityId, options = {}) {
        const now = new Date();

        if (this.isMongoDB()) {
            return this.find({
                communityId,
                date: { $gte: now }
            }, {
                ...options,
                sort: { date: 1 }
            });
        } else {
            const startSk = generateSortKey(now, '');

            const result = await this.getDb().query(this.tableName, {
                keyCondition: 'communityId = :communityId AND sk >= :startSk',
                keyValues: {
                    ':communityId': communityId,
                    ':startSk': startSk
                },
                limit: options.limit,
                scanForward: true
            });
            return result.items;
        }
    }

    /**
     * Create occasion with date-based sort key
     * @param {Object} data 
     * @returns {Promise<Object>}
     */
    async create(data) {
        if (this.isMongoDB()) {
            return super.create(data);
        } else {
            const id = this.generateId();
            const createdAt = new Date().toISOString();
            const occasionDate = data.date ? new Date(data.date).toISOString() : createdAt;
            const sk = generateSortKey(occasionDate, id);

            let communityId = data.communityId || data.community;
            if (communityId && typeof communityId === 'object') communityId = communityId.toString();

            let categoryId = data.category;
            if (categoryId && typeof categoryId === 'object') categoryId = categoryId.toString();

            const item = {
                ...data,
                id,
                sk,
                communityId,
                categoryId,
                createdAt
            };

            delete item.community;
            delete item.category;

            return this.getDb().putItem(this.tableName, item);
        }
    }
}

let occasionRepositoryInstance = null;
const getOccasionRepository = () => {
    if (!occasionRepositoryInstance) {
        occasionRepositoryInstance = new OccasionRepository();
    }
    return occasionRepositoryInstance;
};

module.exports = { OccasionRepository, getOccasionRepository };
