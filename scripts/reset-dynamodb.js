#!/usr/bin/env node
// scripts/reset-dynamodb.js - Deletes and recreates all KULL DynamoDB tables

require('dotenv').config();
const { DynamoDBClient, DeleteTableCommand, ListTablesCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { createTables } = require('./create-dynamodb-tables');

const REGION = process.env.AWS_DYNAMODB_REGION || process.env.AWS_REGION || 'ap-south-1';
const PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'kull-dev-';
const client = new DynamoDBClient({ region: REGION });

async function waitForTableDeletion(tableName) {
    process.stdout.write(`Waiting for table ${tableName} to be deleted...`);
    while (true) {
        try {
            await client.send(new DescribeTableCommand({ TableName: tableName }));
            process.stdout.write('.');
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            if (error.name === 'ResourceNotFoundException') {
                process.stdout.write(' Done!\n');
                break;
            }
            throw error;
        }
    }
}

async function waitForTableActive(tableName) {
    process.stdout.write(`Waiting for table ${tableName} to be ACTIVE...`);
    while (true) {
        try {
            const response = await client.send(new DescribeTableCommand({ TableName: tableName }));
            const status = response.Table.TableStatus;
            if (status === 'ACTIVE') {
                process.stdout.write(' Done!\n');
                break;
            }
            process.stdout.write('.');
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error(`\n✗ Error describing table ${tableName}:`, error.message);
            throw error;
        }
    }
}

async function resetTables() {
    console.log(`\n🔥🔥 RESETTING DYNAMODB TABLES WITH PREFIX: ${PREFIX} 🔥🔥`);
    console.log(`Region: ${REGION}\n`);

    // 1. List all tables
    const listResponse = await client.send(new ListTablesCommand({}));
    const tablesToDelete = (listResponse.TableNames || []).filter(name => name.startsWith(PREFIX));

    if (tablesToDelete.length === 0) {
        console.log('No tables found with that prefix to delete.');
    } else {
        console.log(`Found ${tablesToDelete.length} tables to delete:`, tablesToDelete.join(', '));

        // 2. Delete tables
        for (const tableName of tablesToDelete) {
            try {
                await client.send(new DeleteTableCommand({ TableName: tableName }));
                console.log(`✓ Initiated deletion of table: ${tableName}`);
            } catch (error) {
                console.error(`✗ Failed to delete ${tableName}:`, error.message);
            }
        }

        // 3. Wait for deletions to complete
        console.log('\nWaiting for all deletions to finish before recreation...');
        for (const tableName of tablesToDelete) {
            await waitForTableDeletion(tableName);
        }
    }

    // 4. Recreate tables
    console.log('\nStarting table recreation...');
    await createTables();

    // 5. Wait for tables to be ACTIVE
    const newListResponse = await client.send(new ListTablesCommand({}));
    const tablesToWait = (newListResponse.TableNames || []).filter(name => name.startsWith(PREFIX));

    console.log('\nWaiting for all tables to be ACTIVE before starting migration...');
    for (const tableName of tablesToWait) {
        await waitForTableActive(tableName);
    }

    console.log('\n✨ Database reset complete!');
}

resetTables().catch(error => {
    console.error('Reset failed:', error);
    process.exit(1);
});
