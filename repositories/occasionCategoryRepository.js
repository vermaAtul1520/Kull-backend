const { CommunityEntityRepository } = require('./CommunityEntityRepository');

class OccasionCategoryRepository extends CommunityEntityRepository {
    constructor() {
        super('OccasionCategory', 'occasion-categories', 'communityId', 'id');
    }

    async findByNameAndType(name, occasionType, communityId) {
        if (this.isMongoDB()) {
            return this.findOne({ name, occasionType, community: communityId });
        } else {
            // Scan with filter in DynamoDB
            // Use communityId since it is also available and cleaner if consistent
            // But verify data has communityId. Yes it does.
            const result = await this.getDb().scan(this.tableName, {
                filterExpression: '#name = :name AND occasionType = :occasionType AND communityId = :communityId',
                filterValues: {
                    ':name': name,
                    ':occasionType': occasionType,
                    ':communityId': communityId
                },
                expressionAttributeNames: { // Add Names map!
                    '#name': 'name'
                },
                limit: 1
            });
            return this._transformResult(result.items[0]);
        }
    }
}

let instance = null;
const getOccasionCategoryRepository = () => {
    if (!instance) instance = new OccasionCategoryRepository();
    return instance;
};

module.exports = { OccasionCategoryRepository, getOccasionCategoryRepository };
