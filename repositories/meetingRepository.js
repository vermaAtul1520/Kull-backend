// repositories/meetingRepository.js - Meeting Repository

const { CommunityEntityRepository } = require('./CommunityEntityRepository');
const { generateSortKey } = require('../db/schemas/dynamodb-tables');

class MeetingRepository extends CommunityEntityRepository {
    constructor() {
        super('Meeting', 'meetings', 'communityId');
    }

    /**
     * Find upcoming meetings
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
     * Find past meetings
     * @param {string} communityId 
     * @param {Object} options 
     * @returns {Promise<Array<Object>>}
     */
    async findPast(communityId, options = {}) {
        const now = new Date();

        if (this.isMongoDB()) {
            return this.find({
                communityId,
                date: { $lt: now }
            }, {
                ...options,
                sort: { date: -1 }
            });
        } else {
            const endSk = generateSortKey(now, '');

            const items = await this._queryAll(this.tableName, {
                keyCondition: 'communityId = :communityId AND sk < :endSk',
                keyValues: {
                    ':communityId': communityId,
                    ':endSk': endSk
                },
                scanForward: false
            });

            // Sort descending by date
            items.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));

            const skip = options.skip || 0;
            const limit = options.limit || items.length;
            return items.slice(skip, skip + limit);
        }
    }

    /**
     * Create meeting with date-based sort key
     * @param {Object} data 
     * @returns {Promise<Object>}
     */
    async create(data) {
        if (this.isMongoDB()) {
            return super.create(data);
        } else {
            const id = this.generateId();
            const createdAt = new Date().toISOString();
            const meetingDate = data.date ? new Date(data.date).toISOString() : createdAt;
            const sk = generateSortKey(meetingDate, id);

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
     * Search meetings by organizer
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

let meetingRepositoryInstance = null;
const getMeetingRepository = () => {
    if (!meetingRepositoryInstance) {
        meetingRepositoryInstance = new MeetingRepository();
    }
    return meetingRepositoryInstance;
};

module.exports = { MeetingRepository, getMeetingRepository };
