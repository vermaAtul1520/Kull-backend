// repositories/sportsEventRepository.js - Sports Event Repository

const { CommunityEntityRepository } = require('./CommunityEntityRepository');
const { generateSortKey } = require('../db/schemas/dynamodb-tables');

class SportsEventRepository extends CommunityEntityRepository {
    constructor() {
        super('SportsEvent', 'sports', 'communityId');
    }

    /**
     * Find upcoming sports events
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
     * Find events by sport type
     * @param {string} communityId 
     * @param {string} sportType 
     * @returns {Promise<Array<Object>>}
     */
    async findBySportType(communityId, sportType) {
        return this.findByCommunity(communityId, {
            filters: { sportType }
        });
    }

    /**
     * Create sports event with date-based sort key
     * @param {Object} data 
     * @returns {Promise<Object>}
     */
    async create(data) {
        if (this.isMongoDB()) {
            return super.create(data);
        } else {
            const id = this.generateId();
            const createdAt = new Date().toISOString();
            const eventDate = data.date ? new Date(data.date).toISOString() : createdAt;
            const sk = generateSortKey(eventDate, id);

            let communityId = data.communityId || data.community;
            if (typeof communityId === 'object') communityId = communityId.toString();

            const item = {
                ...data,
                id,
                sk,
                communityId,
                createdAt
            };

            delete item.community;

            return this.getDb().putItem(this.tableName, item);
        }
    }

    /**
     * Search sports events by organizer
     * @param {string} communityId 
     * @param {string} organizer 
     * @returns {Promise<Array<Object>>}
     */
    async searchByOrganizer(communityId, organizer) {
        if (this.isMongoDB()) {
            const regex = new RegExp(organizer, 'i');
            return this.find({
                communityId,
                organizer: regex,
                isActive: true
            });
        } else {
            const result = await this.getDb().query(this.tableName, {
                keyCondition: 'communityId = :communityId',
                keyValues: { ':communityId': communityId, ':organizer': organizer, ':isActive': true },
                filterExpression: 'contains(#organizer, :organizer) AND #isActive = :isActive',
                expressionAttributeNames: {
                    '#organizer': 'organizer',
                    '#isActive': 'isActive'
                }
            });
            return result.items;
        }
    }
}

let sportsEventRepositoryInstance = null;
const getSportsEventRepository = () => {
    if (!sportsEventRepositoryInstance) {
        sportsEventRepositoryInstance = new SportsEventRepository();
    }
    return sportsEventRepositoryInstance;
};

module.exports = { SportsEventRepository, getSportsEventRepository };
