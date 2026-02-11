// db/index.js - Database Factory with Environment-based Switching
// Supports MongoDB (Mongoose) and DynamoDB based on DB_TYPE env variable

const DB_TYPE = process.env.DB_TYPE || 'mongodb';

let dbAdapter = null;
let isInitialized = false;

/**
 * Initialize the database connection
 * Uses cached connection for Lambda reuse across invocations
 */
const initializeDatabase = async () => {
    if (isInitialized && dbAdapter) {
        return dbAdapter;
    }

    if (DB_TYPE === 'dynamodb') {
        const { DynamoDBAdapter } = require('./adapters/dynamodb');
        dbAdapter = new DynamoDBAdapter();
        await dbAdapter.initialize();
    } else {
        const { MongoDBAdapter } = require('./adapters/mongodb');
        dbAdapter = new MongoDBAdapter();
        await dbAdapter.initialize();
    }

    isInitialized = true;
    console.log(`Database initialized: ${DB_TYPE}`);
    return dbAdapter;
};

/**
 * Get the current database adapter
 * @returns {Object} The database adapter instance
 */
const getAdapter = () => {
    if (!dbAdapter) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return dbAdapter;
};

/**
 * Get the current database type
 * @returns {string} 'mongodb' or 'dynamodb'
 */
const getDatabaseType = () => DB_TYPE;

/**
 * Check if database is initialized
 * @returns {boolean}
 */
const isDbInitialized = () => isInitialized;

/**
 * Close database connection (useful for graceful shutdown)
 */
const closeDatabase = async () => {
    if (dbAdapter && typeof dbAdapter.close === 'function') {
        await dbAdapter.close();
    }
    isInitialized = false;
    dbAdapter = null;
};

module.exports = {
    initializeDatabase,
    getAdapter,
    getDatabaseType,
    isDbInitialized,
    closeDatabase,
    DB_TYPE
};
