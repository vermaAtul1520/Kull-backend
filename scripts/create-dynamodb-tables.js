#!/usr/bin/env node
// scripts/create-dynamodb-tables.js
// Creates all DynamoDB tables for KULL Backend

const { DynamoDBClient, CreateTableCommand, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
const { getAllTableDefinitions } = require('../db/schemas/dynamodb-tables');

const REGION = process.env.AWS_DYNAMODB_REGION || process.env.AWS_REGION || 'ap-south-1';
const PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'kull-dev-';
const ENDPOINT = process.env.DYNAMODB_ENDPOINT; // For local development

async function createTables() {
    const clientConfig = { region: REGION };

    if (ENDPOINT) {
        clientConfig.endpoint = ENDPOINT;
        clientConfig.credentials = { accessKeyId: 'local', secretAccessKey: 'local' };
        console.log(`Using local DynamoDB at ${ENDPOINT}`);
    }

    const client = new DynamoDBClient(clientConfig);

    // Get existing tables
    const listResponse = await client.send(new ListTablesCommand({}));
    const existingTables = new Set(listResponse.TableNames || []);

    // Get all table definitions with prefix
    const tables = getAllTableDefinitions(PREFIX);

    console.log(`\nCreating DynamoDB tables with prefix: ${PREFIX}`);
    console.log(`Region: ${REGION}\n`);

    for (const [key, definition] of Object.entries(tables)) {
        const tableName = definition.TableName;

        if (existingTables.has(tableName)) {
            console.log(`✓ Table ${tableName} already exists`);
            continue;
        }

        try {
            const params = {
                TableName: tableName,
                KeySchema: definition.KeySchema,
                AttributeDefinitions: definition.AttributeDefinitions,
                BillingMode: definition.BillingMode || 'PAY_PER_REQUEST',
            };

            if (definition.GlobalSecondaryIndexes?.length > 0) {
                params.GlobalSecondaryIndexes = definition.GlobalSecondaryIndexes.map(gsi => ({
                    ...gsi,
                    Projection: gsi.Projection || { ProjectionType: 'ALL' },
                }));
            }

            await client.send(new CreateTableCommand(params));
            console.log(`✓ Created table: ${tableName}`);
        } catch (error) {
            if (error.name === 'ResourceInUseException') {
                console.log(`⚠ Table ${tableName} is being created`);
            } else {
                console.error(`✗ Failed to create ${tableName}:`, error.message);
            }
        }
    }

    console.log('\nDone!');
}

// Run if called directly
if (require.main === module) {
    createTables().catch(console.error);
}

module.exports = { createTables };
