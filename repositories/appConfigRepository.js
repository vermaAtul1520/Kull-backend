// repositories/appConfigRepository.js
const { BaseRepository } = require('./BaseRepository');
require('../models/AppConfig'); // Ensure schema is registered in mongoose

class AppConfigRepository extends BaseRepository {
    constructor() {
        super('AppConfig', 'app-config');
    }

    // Override normalize/denormalize since key is the main hash key, not id
    async findByKey(key) {
        if (this.isMongoDB()) {
            const Model = this.getDb().getModel(this.entityName);
            const result = await Model.findOne({ key }).lean();
            return this._transformResult(result);
        } else {
            const result = await this.getDb().getItem(this.tableName, { key });
            return this._transformResult(result);
        }
    }

    async updateByKey(key, valueObj) {
        if (this.isMongoDB()) {
            const Model = this.getDb().getModel(this.entityName);
            const result = await Model.findOneAndUpdate(
                { key },
                { value: valueObj },
                { new: true, upsert: true }
            ).lean();
            return this._transformResult(result);
        } else {
            // DynamoDB 'putItem' behaves like an upsert
            const result = await this.getDb().putItem(this.tableName, {
                key,
                value: valueObj,
                updatedAt: new Date().toISOString()
            });
            return this._transformResult(result);
        }
    }
}

module.exports = { AppConfigRepository };
