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
            // DynamoDB: Fetch all for category, then filter/sort/skip/limit in memory
            let allItems = [];
            let lastEvaluatedKey = undefined;

            try {
                do {
                    const params = {
                        indexName: 'category-index',
                        keyCondition: 'categoryId = :categoryId',
                        keyValues: { ':categoryId': categoryId },
                        exclusiveStartKey: lastEvaluatedKey
                    };

                    const result = await this.getDb().query(this.tableName, params);
                    allItems.push(...result.items);
                    lastEvaluatedKey = result.lastEvaluatedKey;
                } while (lastEvaluatedKey);
            } catch (error) {
                console.error(`Error fetching all category occasions:`, error);
                throw error;
            }

            // 1. Transform
            let processedItems = this._transformResult(allItems);

            // 2. Sort (Default: createdAt desc - but index SortKey is sk=date#id so it is sorted by date)
            // DynamoDB query with scanForward: false already sorts by SK (date) descending.
            // But if we fetch multiple pages, they are sorted per page. Concatenating them maintains sort?
            // Yes, standard query returns sorted items. Concatenating pages sequentially (if scanning forward) is sorted.
            // But we used scanForward: false?
            // "If you Query a local secondary index or a global secondary index, the results are returned in Sort Key order."
            // If we paginate backwards (scanForward: false), the first page has the newest items. The second page has the next newest.
            // So concatenating `allItems.push(...result.items)` maintains the order: [Newest...Newer...Old...Oldest].
            // So we don't strictly *need* to re-sort if we trust DynamoDB order, but in-memory sort is safer if we merge or modify.
            // Let's re-sort to be safe and consistent with other repos. Date from SK or createdAt.

            processedItems.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateB - dateA;
            });

            // 3. Pagination
            const skip = options.skip || 0;
            const limit = options.limit || processedItems.length;

            return processedItems.slice(skip, skip + limit);
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
            const startSk = generateSortKey(now, '');

            let allItems = [];
            let lastEvaluatedKey = undefined;

            try {
                do {
                    const params = {
                        keyCondition: 'communityId = :communityId AND sk >= :startSk',
                        keyValues: {
                            ':communityId': communityId,
                            ':startSk': startSk
                        },
                        exclusiveStartKey: lastEvaluatedKey
                    };

                    const result = await this.getDb().query(this.tableName, params);
                    allItems.push(...result.items);
                    lastEvaluatedKey = result.lastEvaluatedKey;
                } while (lastEvaluatedKey);
            } catch (error) {
                console.error(`Error fetching upcoming occasions:`, error);
                throw error;
            }

            // 1. Transform
            let processedItems = this._transformResult(allItems);

            // 2. Sort (Ascending date for upcoming)
            processedItems.sort((a, b) => {
                const dateA = new Date(a.date || a.createdAt || 0);
                const dateB = new Date(b.date || b.createdAt || 0);
                return dateA - dateB;
            });

            // 3. Pagination
            const skip = options.skip || 0;
            const limit = options.limit || processedItems.length;

            return processedItems.slice(skip, skip + limit);
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
