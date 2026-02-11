// db/schemas/dynamodb-tables.js - DynamoDB Table Definitions
// Defines table schemas, GSIs, and helper functions for table creation

/**
 * Table configurations for all KULL entities
 * Each table uses a design optimized for DynamoDB access patterns
 */
const TABLE_DEFINITIONS = {
    // ==========================================
    // USERS TABLE
    // ==========================================
    users: {
        TableName: 'users',
        KeySchema: [
            { AttributeName: 'id', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'id', AttributeType: 'S' },
            { AttributeName: 'email', AttributeType: 'S' },
            { AttributeName: 'phone', AttributeType: 'S' },
            { AttributeName: 'communityId', AttributeType: 'S' },
            { AttributeName: 'code', AttributeType: 'S' },
            { AttributeName: 'createdAt', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'email-index',
                KeySchema: [
                    { AttributeName: 'email', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'ALL' }
            },
            {
                IndexName: 'phone-index',
                KeySchema: [
                    { AttributeName: 'phone', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'ALL' }
            },
            {
                IndexName: 'community-index',
                KeySchema: [
                    { AttributeName: 'communityId', KeyType: 'HASH' },
                    { AttributeName: 'createdAt', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' }
            },
            {
                IndexName: 'code-index',
                KeySchema: [
                    { AttributeName: 'code', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'ALL' }
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    },

    // ==========================================
    // COMMUNITIES TABLE
    // ==========================================
    communities: {
        TableName: 'communities',
        KeySchema: [
            { AttributeName: 'id', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'id', AttributeType: 'S' },
            { AttributeName: 'code', AttributeType: 'S' },
            { AttributeName: 'name', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'code-index',
                KeySchema: [
                    { AttributeName: 'code', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'ALL' }
            },
            {
                IndexName: 'name-index',
                KeySchema: [
                    { AttributeName: 'name', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'ALL' }
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    },

    // ==========================================
    // COMMUNITY CONFIGURATIONS TABLE
    // ==========================================
    'community-config': {
        TableName: 'community-config',
        KeySchema: [
            { AttributeName: 'communityId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'communityId', AttributeType: 'S' },
        ],
        BillingMode: 'PAY_PER_REQUEST'
    },

    // ==========================================
    // POSTS TABLE
    // Partition by community for efficient queries
    // ==========================================
    posts: {
        TableName: 'posts',
        KeySchema: [
            { AttributeName: 'communityId', KeyType: 'HASH' },
            { AttributeName: 'sk', KeyType: 'RANGE' } // sk = createdAt#id for ordering
        ],
        AttributeDefinitions: [
            { AttributeName: 'communityId', AttributeType: 'S' },
            { AttributeName: 'sk', AttributeType: 'S' },
            { AttributeName: 'id', AttributeType: 'S' },
            { AttributeName: 'authorId', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'id-index',
                KeySchema: [
                    { AttributeName: 'id', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'ALL' }
            },
            {
                IndexName: 'author-index',
                KeySchema: [
                    { AttributeName: 'authorId', KeyType: 'HASH' },
                    { AttributeName: 'sk', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' }
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    },

    // ==========================================
    // DONATIONS TABLE
    // ==========================================
    donations: {
        TableName: 'donations',
        KeySchema: [
            { AttributeName: 'communityId', KeyType: 'HASH' },
            { AttributeName: 'sk', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'communityId', AttributeType: 'S' },
            { AttributeName: 'sk', AttributeType: 'S' },
            { AttributeName: 'id', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'id-index',
                KeySchema: [
                    { AttributeName: 'id', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'ALL' }
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    },

    // ==========================================
    // NEWS TABLE
    // ==========================================
    news: {
        TableName: 'news',
        KeySchema: [
            { AttributeName: 'communityId', KeyType: 'HASH' },
            { AttributeName: 'sk', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'communityId', AttributeType: 'S' },
            { AttributeName: 'sk', AttributeType: 'S' },
            { AttributeName: 'id', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'id-index',
                KeySchema: [
                    { AttributeName: 'id', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'ALL' }
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    },

    // ==========================================
    // OCCASIONS TABLE
    // ==========================================
    occasions: {
        TableName: 'occasions',
        KeySchema: [
            { AttributeName: 'communityId', KeyType: 'HASH' },
            { AttributeName: 'sk', KeyType: 'RANGE' } // sk = date#id
        ],
        AttributeDefinitions: [
            { AttributeName: 'communityId', AttributeType: 'S' },
            { AttributeName: 'sk', AttributeType: 'S' },
            { AttributeName: 'id', AttributeType: 'S' },
            { AttributeName: 'categoryId', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'id-index',
                KeySchema: [
                    { AttributeName: 'id', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'ALL' }
            },
            {
                IndexName: 'category-index',
                KeySchema: [
                    { AttributeName: 'categoryId', KeyType: 'HASH' },
                    { AttributeName: 'sk', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' }
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    },

    // ==========================================
    // OCCASION CATEGORIES TABLE
    // ==========================================
    'occasion-categories': {
        TableName: 'occasion-categories',
        KeySchema: [
            { AttributeName: 'communityId', KeyType: 'HASH' },
            { AttributeName: 'id', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'communityId', AttributeType: 'S' },
            { AttributeName: 'id', AttributeType: 'S' },
        ],
        BillingMode: 'PAY_PER_REQUEST'
    },

    // ==========================================
    // APPEALS TABLE
    // ==========================================
    appeals: {
        TableName: 'appeals',
        KeySchema: [
            { AttributeName: 'communityId', KeyType: 'HASH' },
            { AttributeName: 'sk', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'communityId', AttributeType: 'S' },
            { AttributeName: 'sk', AttributeType: 'S' },
            { AttributeName: 'id', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'id-index',
                KeySchema: [
                    { AttributeName: 'id', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'ALL' }
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    },

    // ==========================================
    // DUKAANS TABLE
    // ==========================================
    dukaans: {
        TableName: 'dukaans',
        KeySchema: [
            { AttributeName: 'communityId', KeyType: 'HASH' },
            { AttributeName: 'sk', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'communityId', AttributeType: 'S' },
            { AttributeName: 'sk', AttributeType: 'S' },
            { AttributeName: 'id', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'id-index',
                KeySchema: [
                    { AttributeName: 'id', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'ALL' }
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    },

    // ==========================================
    // EDUCATION RESOURCES TABLE
    // ==========================================
    education: {
        TableName: 'education',
        KeySchema: [
            { AttributeName: 'communityId', KeyType: 'HASH' },
            { AttributeName: 'sk', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'communityId', AttributeType: 'S' },
            { AttributeName: 'sk', AttributeType: 'S' },
            { AttributeName: 'id', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'id-index',
                KeySchema: [
                    { AttributeName: 'id', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'ALL' }
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    },

    // ==========================================
    // JOB POSTS TABLE
    // ==========================================
    jobs: {
        TableName: 'jobs',
        KeySchema: [
            { AttributeName: 'communityId', KeyType: 'HASH' },
            { AttributeName: 'sk', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'communityId', AttributeType: 'S' },
            { AttributeName: 'sk', AttributeType: 'S' },
            { AttributeName: 'id', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'id-index',
                KeySchema: [
                    { AttributeName: 'id', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'ALL' }
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    },

    // ==========================================
    // KARTAVYA TABLE
    // ==========================================
    kartavya: {
        TableName: 'kartavya',
        KeySchema: [
            { AttributeName: 'communityId', KeyType: 'HASH' },
            { AttributeName: 'sk', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'communityId', AttributeType: 'S' },
            { AttributeName: 'sk', AttributeType: 'S' },
            { AttributeName: 'id', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'id-index',
                KeySchema: [
                    { AttributeName: 'id', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'ALL' }
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    },

    // ==========================================
    // MEETINGS TABLE
    // ==========================================
    meetings: {
        TableName: 'meetings',
        KeySchema: [
            { AttributeName: 'communityId', KeyType: 'HASH' },
            { AttributeName: 'sk', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'communityId', AttributeType: 'S' },
            { AttributeName: 'sk', AttributeType: 'S' },
            { AttributeName: 'id', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'id-index',
                KeySchema: [
                    { AttributeName: 'id', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'ALL' }
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    },

    // ==========================================
    // SPORTS EVENTS TABLE
    // ==========================================
    sports: {
        TableName: 'sports',
        KeySchema: [
            { AttributeName: 'communityId', KeyType: 'HASH' },
            { AttributeName: 'sk', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'communityId', AttributeType: 'S' },
            { AttributeName: 'sk', AttributeType: 'S' },
            { AttributeName: 'id', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'id-index',
                KeySchema: [
                    { AttributeName: 'id', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'ALL' }
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    },

    // ==========================================
    // BHAJANS TABLE
    // ==========================================
    bhajans: {
        TableName: 'bhajans',
        KeySchema: [
            { AttributeName: 'communityId', KeyType: 'HASH' },
            { AttributeName: 'sk', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'communityId', AttributeType: 'S' },
            { AttributeName: 'sk', AttributeType: 'S' },
            { AttributeName: 'id', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'id-index',
                KeySchema: [
                    { AttributeName: 'id', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'ALL' }
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    },

    // ==========================================
    // FAMILY RELATIONSHIPS TABLE
    // Bi-directional relationship storage
    // ==========================================
    family: {
        TableName: 'family',
        KeySchema: [
            { AttributeName: 'userId', KeyType: 'HASH' },
            { AttributeName: 'relatedUserId', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'userId', AttributeType: 'S' },
            { AttributeName: 'relatedUserId', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'reverse-index',
                KeySchema: [
                    { AttributeName: 'relatedUserId', KeyType: 'HASH' },
                    { AttributeName: 'userId', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' }
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    },

    // ==========================================
    // COMMENTS TABLE
    // ==========================================
    comments: {
        TableName: 'comments',
        KeySchema: [
            { AttributeName: 'postId', KeyType: 'HASH' },
            { AttributeName: 'sk', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'postId', AttributeType: 'S' },
            { AttributeName: 'sk', AttributeType: 'S' },
            { AttributeName: 'id', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'id-index',
                KeySchema: [
                    { AttributeName: 'id', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'ALL' }
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    },

    // ==========================================
    // LIKES TABLE
    // ==========================================
    likes: {
        TableName: 'likes',
        KeySchema: [
            { AttributeName: 'postId', KeyType: 'HASH' },
            { AttributeName: 'userId', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'postId', AttributeType: 'S' },
            { AttributeName: 'userId', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'user-index',
                KeySchema: [
                    { AttributeName: 'userId', KeyType: 'HASH' },
                    { AttributeName: 'postId', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' }
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    },
    // ==========================================
    // OCCASION CONTENTS TABLE
    // ==========================================
    'occasion-contents': {
        TableName: 'occasion-contents',
        KeySchema: [
            { AttributeName: 'occasionId', KeyType: 'HASH' },
            { AttributeName: 'id', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'occasionId', AttributeType: 'S' },
            { AttributeName: 'id', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'id-index',
                KeySchema: [
                    { AttributeName: 'id', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'ALL' }
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    },
};

/**
 * Helper function to generate sort key for time-ordered items
 * @param {Date|string} date 
 * @param {string} id 
 * @returns {string}
 */
const generateSortKey = (date, id) => {
    const dateStr = date instanceof Date ? date.toISOString() : date;
    return `${dateStr}#${id}`;
};

/**
 * Helper function to parse sort key back to date and id
 * @param {string} sk 
 * @returns {{ date: string, id: string }}
 */
const parseSortKey = (sk) => {
    const [date, id] = sk.split('#');
    return { date, id };
};

/**
 * Get table definition with prefix applied
 * @param {string} tableName 
 * @param {string} prefix 
 * @returns {Object}
 */
const getTableDefinition = (tableName, prefix = 'kull-') => {
    const definition = TABLE_DEFINITIONS[tableName];
    if (!definition) {
        throw new Error(`Unknown table: ${tableName}`);
    }

    return {
        ...definition,
        TableName: `${prefix}${definition.TableName}`,
    };
};

/**
 * Get all table definitions with prefix applied
 * @param {string} prefix 
 * @returns {Object}
 */
const getAllTableDefinitions = (prefix = 'kull-') => {
    const definitions = {};
    for (const [key, value] of Object.entries(TABLE_DEFINITIONS)) {
        definitions[key] = {
            ...value,
            TableName: `${prefix}${value.TableName}`,
        };
    }
    return definitions;
};

module.exports = {
    TABLE_DEFINITIONS,
    generateSortKey,
    parseSortKey,
    getTableDefinition,
    getAllTableDefinitions,
};
