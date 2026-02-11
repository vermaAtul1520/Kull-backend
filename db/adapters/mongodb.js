// db/adapters/mongodb.js - MongoDB Adapter using Mongoose
// Wraps existing Mongoose models with a consistent interface

const mongoose = require('mongoose');

class MongoDBAdapter {
    constructor() {
        this.connection = null;
        this.isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    }

    /**
     * Initialize MongoDB connection
     * Uses connection caching for Lambda reuse
     */
    async initialize() {
        // Return cached connection if available
        if (this.connection && mongoose.connection.readyState === 1) {
            console.log('Using cached MongoDB connection');
            return this.connection;
        }

        const MONGO_URI = process.env.MONGO_URI;
        if (!MONGO_URI) {
            throw new Error('MONGO_URI environment variable is required');
        }

        const connectionOptions = {
            maxPoolSize: this.isLambda ? 10 : 50,
            minPoolSize: this.isLambda ? 1 : 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
            bufferCommands: !this.isLambda,
        };

        this.connection = await mongoose.connect(MONGO_URI, connectionOptions);

        console.log('MongoDB connected successfully');
        console.log(`Connection pool: min=${connectionOptions.minPoolSize}, max=${connectionOptions.maxPoolSize}`);
        console.log(`Environment: ${this.isLambda ? 'AWS Lambda' : 'Standard'}`);

        return this.connection;
    }

    /**
     * Close MongoDB connection
     */
    async close() {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            console.log('MongoDB connection closed');
        }
    }

    /**
     * Get a Mongoose model by name
     * @param {string} modelName - Name of the model
     * @returns {mongoose.Model}
     */
    getModel(modelName) {
        return mongoose.model(modelName);
    }

    /**
     * Generate a new ObjectId
     * @returns {mongoose.Types.ObjectId}
     */
    generateId() {
        return new mongoose.Types.ObjectId();
    }

    /**
     * Check if a string is a valid ObjectId
     * @param {string} id 
     * @returns {boolean}
     */
    isValidId(id) {
        return mongoose.Types.ObjectId.isValid(id);
    }

    /**
     * Convert string to ObjectId
     * @param {string} id 
     * @returns {mongoose.Types.ObjectId}
     */
    toObjectId(id) {
        return new mongoose.Types.ObjectId(id);
    }

    /**
     * Start a database transaction (session)
     * @returns {Promise<mongoose.ClientSession>}
     */
    async startTransaction() {
        const session = await mongoose.startSession();
        session.startTransaction();
        return session;
    }

    /**
     * Commit a transaction
     * @param {mongoose.ClientSession} session 
     */
    async commitTransaction(session) {
        await session.commitTransaction();
        session.endSession();
    }

    /**
     * Abort a transaction
     * @param {mongoose.ClientSession} session 
     */
    async abortTransaction(session) {
        await session.abortTransaction();
        session.endSession();
    }

    /**
     * Get adapter type
     * @returns {string}
     */
    getType() {
        return 'mongodb';
    }
}

module.exports = { MongoDBAdapter };
