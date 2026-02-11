// db/adapters/dynamodb.js - DynamoDB Adapter using AWS SDK v3
// Provides consistent interface matching MongoDB adapter

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    UpdateCommand,
    DeleteCommand,
    QueryCommand,
    ScanCommand,
    BatchGetCommand,
    BatchWriteCommand,
    TransactWriteCommand
} = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

class DynamoDBAdapter {
    constructor() {
        this.client = null;
        this.docClient = null;
        this.tablePrefix = process.env.DYNAMODB_TABLE_PREFIX || 'kull-';
        this.region = process.env.AWS_DYNAMODB_REGION || process.env.AWS_REGION || 'ap-south-1';
        this.isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    }

    /**
     * Initialize DynamoDB client
     * Uses lazy initialization for Lambda cold start optimization
     */
    async initialize() {
        if (this.docClient) {
            console.log('Using cached DynamoDB connection');
            return this.docClient;
        }

        const clientConfig = {
            region: this.region,
        };

        // For local development with LocalStack or DynamoDB Local
        if (process.env.DYNAMODB_ENDPOINT) {
            clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
            clientConfig.credentials = {
                accessKeyId: 'local',
                secretAccessKey: 'local'
            };
        }

        this.client = new DynamoDBClient(clientConfig);

        // Create document client with marshalling options
        this.docClient = DynamoDBDocumentClient.from(this.client, {
            marshallOptions: {
                convertEmptyValues: true,
                removeUndefinedValues: true,
                convertClassInstanceToMap: true,
            },
            unmarshallOptions: {
                wrapNumbers: false,
            },
        });

        console.log('DynamoDB connected successfully');
        console.log(`Region: ${this.region}, Table Prefix: ${this.tablePrefix}`);
        console.log(`Environment: ${this.isLambda ? 'AWS Lambda' : 'Standard'}`);

        return this.docClient;
    }

    /**
     * Close DynamoDB client (cleanup)
     */
    async close() {
        if (this.client) {
            this.client.destroy();
            this.client = null;
            this.docClient = null;
            console.log('DynamoDB connection closed');
        }
    }

    /**
     * Get full table name with prefix
     * @param {string} tableName - Base table name
     * @returns {string}
     */
    getTableName(tableName) {
        return `${this.tablePrefix}${tableName}`;
    }

    /**
     * Generate a new UUID
     * @returns {string}
     */
    generateId() {
        return uuidv4();
    }

    /**
     * Check if a string is a valid UUID
     * @param {string} id 
     * @returns {boolean}
     */
    isValidId(id) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
    }

    /**
     * Get a single item by primary key
     * @param {string} tableName 
     * @param {Object} key - Primary key object
     * @returns {Promise<Object|null>}
     */
    async getItem(tableName, key) {
        const command = new GetCommand({
            TableName: this.getTableName(tableName),
            Key: key,
        });

        const response = await this.docClient.send(command);
        return response.Item || null;
    }

    /**
     * Put (create/replace) an item
     * @param {string} tableName 
     * @param {Object} item 
     * @returns {Promise<Object>}
     */
    async putItem(tableName, item) {
        // Add timestamps if not present
        const now = new Date().toISOString();
        if (!item.createdAt) {
            item.createdAt = now;
        }
        item.updatedAt = now;

        const command = new PutCommand({
            TableName: this.getTableName(tableName),
            Item: item,
        });

        await this.docClient.send(command);
        return item;
    }

    /**
     * Update an item with partial data
     * @param {string} tableName 
     * @param {Object} key - Primary key
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>}
     */
    async updateItem(tableName, key, updates) {
        // Build update expression
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        // Always update updatedAt
        updates.updatedAt = new Date().toISOString();

        Object.entries(updates).forEach(([field, value], index) => {
            const attrName = `#field${index}`;
            const attrValue = `:value${index}`;

            updateExpressions.push(`${attrName} = ${attrValue}`);
            expressionAttributeNames[attrName] = field;
            expressionAttributeValues[attrValue] = value;
        });

        const command = new UpdateCommand({
            TableName: this.getTableName(tableName),
            Key: key,
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW',
        });

        const response = await this.docClient.send(command);
        return response.Attributes;
    }

    /**
     * Delete an item
     * @param {string} tableName 
     * @param {Object} key - Primary key
     * @returns {Promise<boolean>}
     */
    async deleteItem(tableName, key) {
        const command = new DeleteCommand({
            TableName: this.getTableName(tableName),
            Key: key,
        });

        await this.docClient.send(command);
        return true;
    }

    /**
     * Query items by partition key (and optionally sort key)
     * @param {string} tableName 
     * @param {Object} options - Query options
     * @returns {Promise<Object>} { items, lastEvaluatedKey }
     */
    async query(tableName, options) {
        const {
            keyCondition,
            keyValues,
            indexName,
            filterExpression,
            filterValues,
            limit,
            scanForward = true,
            exclusiveStartKey,
            projectionExpression,
            expressionAttributeNames,
        } = options;

        const commandParams = {
            TableName: this.getTableName(tableName),
            KeyConditionExpression: keyCondition,
            ExpressionAttributeValues: { ...keyValues, ...filterValues },
            ScanIndexForward: scanForward,
        };

        if (indexName) {
            commandParams.IndexName = indexName;
        }

        if (filterExpression) {
            commandParams.FilterExpression = filterExpression;
        }

        if (limit) {
            commandParams.Limit = limit;
        }

        if (exclusiveStartKey) {
            commandParams.ExclusiveStartKey = exclusiveStartKey;
        }

        if (projectionExpression) {
            commandParams.ProjectionExpression = projectionExpression;
        }

        if (expressionAttributeNames) {
            commandParams.ExpressionAttributeNames = expressionAttributeNames;
        }

        const command = new QueryCommand(commandParams);
        const response = await this.docClient.send(command);

        return {
            items: response.Items || [],
            lastEvaluatedKey: response.LastEvaluatedKey,
            count: response.Count,
        };
    }

    /**
     * Scan entire table (use sparingly)
     * @param {string} tableName 
     * @param {Object} options 
     * @returns {Promise<Object>}
     */
    async scan(tableName, options = {}) {
        const {
            filterExpression,
            filterValues,
            limit,
            exclusiveStartKey,
            projectionExpression,
            expressionAttributeNames,
        } = options;

        const commandParams = {
            TableName: this.getTableName(tableName),
        };

        if (filterExpression) {
            commandParams.FilterExpression = filterExpression;
            commandParams.ExpressionAttributeValues = filterValues;
        }

        if (limit) {
            commandParams.Limit = limit;
        }

        if (exclusiveStartKey) {
            commandParams.ExclusiveStartKey = exclusiveStartKey;
        }

        if (projectionExpression) {
            commandParams.ProjectionExpression = projectionExpression;
        }

        if (expressionAttributeNames) {
            commandParams.ExpressionAttributeNames = expressionAttributeNames;
        }

        const command = new ScanCommand(commandParams);
        const response = await this.docClient.send(command);

        return {
            items: response.Items || [],
            lastEvaluatedKey: response.LastEvaluatedKey,
            count: response.Count,
        };
    }

    /**
     * Batch get multiple items by keys
     * @param {string} tableName 
     * @param {Array<Object>} keys 
     * @returns {Promise<Array<Object>>}
     */
    async batchGetItems(tableName, keys) {
        const fullTableName = this.getTableName(tableName);

        // DynamoDB batch get limit is 100 items
        const chunks = [];
        for (let i = 0; i < keys.length; i += 100) {
            chunks.push(keys.slice(i, i + 100));
        }

        const allItems = [];

        for (const chunk of chunks) {
            const command = new BatchGetCommand({
                RequestItems: {
                    [fullTableName]: {
                        Keys: chunk,
                    },
                },
            });

            const response = await this.docClient.send(command);
            const items = response.Responses?.[fullTableName] || [];
            allItems.push(...items);
        }

        return allItems;
    }

    /**
     * Batch write (put/delete) multiple items
     * @param {string} tableName 
     * @param {Array<Object>} putItems - Items to put
     * @param {Array<Object>} deleteKeys - Keys to delete
     * @returns {Promise<boolean>}
     */
    async batchWriteItems(tableName, putItems = [], deleteKeys = []) {
        const fullTableName = this.getTableName(tableName);
        const requests = [];

        // Add put requests
        for (const item of putItems) {
            const now = new Date().toISOString();
            if (!item.createdAt) item.createdAt = now;
            item.updatedAt = now;

            requests.push({ PutRequest: { Item: item } });
        }

        // Add delete requests
        for (const key of deleteKeys) {
            requests.push({ DeleteRequest: { Key: key } });
        }

        // DynamoDB batch write limit is 25 items
        const chunks = [];
        for (let i = 0; i < requests.length; i += 25) {
            chunks.push(requests.slice(i, i + 25));
        }

        for (const chunk of chunks) {
            const command = new BatchWriteCommand({
                RequestItems: {
                    [fullTableName]: chunk,
                },
            });

            await this.docClient.send(command);
        }

        return true;
    }

    /**
     * Execute a transaction with multiple operations
     * @param {Array<Object>} transactItems 
     * @returns {Promise<boolean>}
     */
    async transactWrite(transactItems) {
        const command = new TransactWriteCommand({
            TransactItems: transactItems,
        });

        await this.docClient.send(command);
        return true;
    }

    /**
     * Get adapter type
     * @returns {string}
     */
    getType() {
        return 'dynamodb';
    }
}

module.exports = { DynamoDBAdapter };
