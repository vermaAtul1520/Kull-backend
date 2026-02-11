// repositories/occasionContentRepository.js - Occasion Content Repository

const { BaseRepository } = require('./BaseRepository');

class OccasionContentRepository extends BaseRepository {
    constructor() {
        super('OccasionContent', 'occasion-contents');
    }

    /**
     * Find contents by occasion ID
     * @param {string} occasionId 
     * @returns {Promise<Array<Object>>}
     */
    async findByOccasion(occasionId) {
        if (this.isMongoDB()) {
            return this.find({ occasion: occasionId });
        } else {
            try {
                // occasionId is the partition key (HASH) for occasion-contents table
                const result = await this.getDb().query(this.tableName, {
                    keyCondition: 'occasionId = :occasionId',
                    keyValues: { ':occasionId': occasionId }
                });
                return this._transformResult(result.items);
            } catch (error) {
                if (error.name === 'ResourceNotFoundException') {
                    console.warn(`Table ${this.tableName} not found. Returning empty contents.`);
                    return [];
                }
                throw error;
            }
        }
    }

    /**
     * Bulk create contents
     * @param {Array<Object>} contents 
     * @returns {Promise<Array<Object>>}
     */
    async insertMany(contents) {
        if (this.isMongoDB()) {
            return super.insertMany(contents);
        } else {
            // DynamoDB BatchWrite
            // Note: BatchWrite has limit of 25 items. We might need to chunk.
            // For now, simple loop or BaseRepository might have batch? BaseRepository generic insertMany?
            // BaseRepository.js likely doesn't have optimized batch for DynamoDB yet purely generic.
            // I'll implement loop here for safety or check BaseRepository.
            // Let's just map create promises.
            return Promise.all(contents.map(c => this.create(c)));
        }
    }

    async create(data) {
        if (this.isMongoDB()) {
            return super.create(data);
        } else {
            const id = this.generateId();
            const createdAt = new Date().toISOString();

            let occasionId = data.occasion || data.occasionId;
            if (typeof occasionId === 'object') occasionId = occasionId.toString();

            const item = {
                ...data,
                id,
                occasionId,
                createdAt
            };

            delete item.occasion;

            return this.getDb().putItem(this.tableName, item);
        }
    }
}

let instance = null;
const getOccasionContentRepository = () => {
    if (!instance) instance = new OccasionContentRepository();
    return instance;
};

module.exports = { OccasionContentRepository, getOccasionContentRepository };
