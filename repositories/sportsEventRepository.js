// repositories/sportsEventRepository.js - Sports Event Repository

const { CommunityEntityRepository } = require('./CommunityEntityRepository');
const { generateSortKey } = require('../db/schemas/dynamodb-tables');

class SportsEventRepository extends CommunityEntityRepository {
    constructor() {
        super('SportsEvent', 'sports', 'community');
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

            const items = await this._queryAll(this.tableName, {
                keyCondition: 'communityId = :communityId AND sk >= :startSk',
                keyValues: {
                    ':communityId': communityId,
                    ':startSk': startSk
                },
                scanForward: true
            });

            // Sort ascending by date
            items.sort((a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0));

            const skip = options.skip || 0;
            const limit = options.limit || items.length;
            return items.slice(skip, skip + limit);
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
            const items = await this._queryAll(this.tableName, {
                keyCondition: 'communityId = :communityId',
                keyValues: { ':communityId': communityId },
                filterExpression: 'contains(#organizer, :organizer) AND #isActive = :isActive',
                filterValues: { ':organizer': organizer, ':isActive': true },
                expressionAttributeNames: {
                    '#organizer': 'organizer',
                    '#isActive': 'isActive'
                }
            });
            return items;
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
