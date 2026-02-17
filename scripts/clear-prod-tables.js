const { DynamoDBClient, ScanCommand, BatchWriteItemCommand, DeleteTableCommand, CreateTableCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
require("dotenv").config();

const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || "kull-prod-";
const REGION = process.env.AWS_DYNAMODB_REGION || "ap-south-1";

const client = new DynamoDBClient({ region: REGION });

const tablesToClear = [
    "users",
    "communities",
    "community-config",
    "posts",
    "donations",
    "news",
    "occasions",
    "occasion-categories",
    "appeals",
    "dukaans",
    "education",
    "jobs",
    "kartavya",
    "meetings",
    "sports",
    "bhajans",
    "family",
    "comments",
    "likes",
    "occasion-contents"
];

async function clearTable(tableName) {
    const fullTableName = `${TABLE_PREFIX}${tableName}`;
    console.log(`Clearing table: ${fullTableName}`);

    try {
        let lastEvaluatedKey = undefined;
        let deletedCount = 0;

        // Describe table to get KeySchema
        const describeParams = { TableName: fullTableName };
        const tableInfo = await client.send(new DescribeTableCommand(describeParams));
        const keySchema = tableInfo.Table.KeySchema;
        const hashKey = keySchema.find(k => k.KeyType === "HASH").AttributeName;
        const rangeKey = keySchema.find(k => k.KeyType === "RANGE")?.AttributeName;

        do {
            const scanParams = {
                TableName: fullTableName,
                ExclusiveStartKey: lastEvaluatedKey,
                Limit: 25,
                ProjectionExpression: rangeKey ? `${hashKey}, ${rangeKey}` : hashKey
            };

            const scanResult = await client.send(new ScanCommand(scanParams));
            const items = scanResult.Items || [];

            if (items.length > 0) {
                const deleteRequests = items.map(item => ({
                    DeleteRequest: {
                        Key: item
                    }
                }));

                const batchParams = {
                    RequestItems: {
                        [fullTableName]: deleteRequests
                    }
                };

                await client.send(new BatchWriteItemCommand(batchParams));
                deletedCount += items.length;
                console.log(`  Deleted ${deletedCount} items...`);
            }

            lastEvaluatedKey = scanResult.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        console.log(`✓ Successfully cleared ${fullTableName}`);
    } catch (error) {
        if (error.name === "ResourceNotFoundException") {
            console.warn(`! Table ${fullTableName} does not exist, skipping.`);
        } else {
            console.error(`✗ Error clearing ${fullTableName}:`, error.message);
        }
    }
}

async function run() {
    console.log("!!! WARNING: THIS WILL DELETE ALL DATA IN PRODUCTION TABLES !!!");
    console.log("Region:", REGION);
    console.log("Prefix:", TABLE_PREFIX);

    // Checking for a confirmation flag to prevent accidental runs
    if (!process.argv.includes("--confirm")) {
        console.log("\nTo verify and run, use: node scripts/clear-prod-tables.js --confirm");
        process.exit(0);
    }

    for (const table of tablesToClear) {
        await clearTable(table);
    }

    console.log("\nAll specified tables have been cleared.");
}

run().catch(console.error);
