// tests/integration/dynamodb/adapter.test.js
// Integration tests for DynamoDB Adapter
// Requires local DynamoDB running: npm run db:local

const { DynamoDBClient, CreateTableCommand, DeleteTableCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const TEST_TABLE = 'kull-test-integration';

describe('DynamoDB Adapter Integration Tests', () => {
    let client;
    let docClient;
    let tableCreated = false;

    beforeAll(async () => {
        // Skip if local DynamoDB endpoint not available
        if (!process.env.DYNAMODB_ENDPOINT) {
            console.log('Skipping DynamoDB integration tests - DYNAMODB_ENDPOINT not set');
            return;
        }

        client = new DynamoDBClient({
            region: 'us-east-1',
            endpoint: process.env.DYNAMODB_ENDPOINT,
            credentials: {
                accessKeyId: 'fakeAccessKey',
                secretAccessKey: 'fakeSecretKey',
            },
        });

        docClient = DynamoDBDocumentClient.from(client);

        // Create test table
        try {
            await client.send(new CreateTableCommand({
                TableName: TEST_TABLE,
                KeySchema: [
                    { AttributeName: 'pk', KeyType: 'HASH' },
                    { AttributeName: 'sk', KeyType: 'RANGE' },
                ],
                AttributeDefinitions: [
                    { AttributeName: 'pk', AttributeType: 'S' },
                    { AttributeName: 'sk', AttributeType: 'S' },
                ],
                BillingMode: 'PAY_PER_REQUEST',
            }));
            tableCreated = true;
            // Wait for table to be active
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            if (error.name !== 'ResourceInUseException') {
                console.error('Failed to create test table:', error);
            } else {
                tableCreated = true;
            }
        }
    });

    afterAll(async () => {
        if (tableCreated && client) {
            try {
                await client.send(new DeleteTableCommand({ TableName: TEST_TABLE }));
            } catch (error) {
                // Ignore cleanup errors
            }
        }
    });

    describe('Basic CRUD Operations', () => {
        it('should put and get an item', async () => {
            if (!docClient) return;

            const item = {
                pk: 'USER#test123',
                sk: '2024-01-01T00:00:00Z#test123',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
            };

            // Put item
            await docClient.send(new PutCommand({
                TableName: TEST_TABLE,
                Item: item,
            }));

            // Get item
            const result = await docClient.send(new GetCommand({
                TableName: TEST_TABLE,
                Key: { pk: item.pk, sk: item.sk },
            }));

            expect(result.Item).toBeDefined();
            expect(result.Item.firstName).toBe('John');
            expect(result.Item.email).toBe('john@example.com');
        });

        it('should query items by partition key', async () => {
            if (!docClient) return;

            // Insert multiple items with same pk
            const pk = 'COMMUNITY#comm123';
            for (let i = 0; i < 3; i++) {
                await docClient.send(new PutCommand({
                    TableName: TEST_TABLE,
                    Item: {
                        pk,
                        sk: `2024-01-0${i + 1}T00:00:00Z#user${i}`,
                        name: `User ${i}`,
                    },
                }));
            }

            // Query
            const result = await docClient.send(new QueryCommand({
                TableName: TEST_TABLE,
                KeyConditionExpression: 'pk = :pk',
                ExpressionAttributeValues: { ':pk': pk },
            }));

            expect(result.Items).toBeDefined();
            expect(result.Items.length).toBe(3);
        });

        it('should delete an item', async () => {
            if (!docClient) return;

            const item = {
                pk: 'DELETE#test',
                sk: 'item1',
            };

            // Put item
            await docClient.send(new PutCommand({
                TableName: TEST_TABLE,
                Item: item,
            }));

            // Delete item
            await docClient.send(new DeleteCommand({
                TableName: TEST_TABLE,
                Key: { pk: item.pk, sk: item.sk },
            }));

            // Verify deleted
            const result = await docClient.send(new GetCommand({
                TableName: TEST_TABLE,
                Key: { pk: item.pk, sk: item.sk },
            }));

            expect(result.Item).toBeUndefined();
        });
    });

    describe('Conditional Operations', () => {
        it('should fail conditional put if item exists', async () => {
            if (!docClient) return;

            const item = {
                pk: 'COND#test',
                sk: 'item1',
                value: 'original',
            };

            // First put
            await docClient.send(new PutCommand({
                TableName: TEST_TABLE,
                Item: item,
            }));

            // Conditional put should fail
            await expect(
                docClient.send(new PutCommand({
                    TableName: TEST_TABLE,
                    Item: { ...item, value: 'updated' },
                    ConditionExpression: 'attribute_not_exists(pk)',
                }))
            ).rejects.toThrow();
        });
    });
});
