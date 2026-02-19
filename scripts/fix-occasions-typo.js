#!/usr/bin/env node
/**
 * scripts/fix-occasions-typo.js
 * Maintenance Script to fix "Occasionss" typo in community configuration.
 * Usage: node scripts/fix-occasions-typo.js [--dry-run]
 */

require('dotenv').config();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

// Configuration
const TABLE_NAME = `${process.env.DYNAMODB_TABLE_PREFIX || 'kull-prod-'}community-config`;
const REGION = process.env.AWS_DYNAMODB_REGION || 'ap-south-1';
const ENDPOINT = process.env.DYNAMODB_ENDPOINT;

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

console.log('='.repeat(60));
console.log('Fixing "Occasionss" Typo in Community Configuration');
console.log('='.repeat(60));
console.log(`Table: ${TABLE_NAME}`);
console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
console.log('='.repeat(60));

const dynamoClient = new DynamoDBClient({
    region: REGION,
    ...(ENDPOINT && { endpoint: ENDPOINT }),
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

async function run() {
    try {
        console.log('\nScanning table for records with typo...');
        const scanCommand = new ScanCommand({
            TableName: TABLE_NAME,
        });

        const response = await docClient.send(scanCommand);
        const items = response.Items || [];
        console.log(`Found ${items.length} records in total.`);

        let fixCount = 0;
        for (const item of items) {
            const drorOption = item.drorOption;
            if (drorOption && drorOption.occasions && drorOption.occasions.label === 'Occasionss') {
                console.log(`- Found typo in community: ${item.communityId}`);

                if (isDryRun) {
                    console.log('  [DRY RUN] Would update "Occasionss" -> "Occasions"');
                } else {
                    const updatedDrorOption = { ...drorOption };
                    updatedDrorOption.occasions = { ...updatedDrorOption.occasions, label: 'Occasions' };

                    const updateCommand = new UpdateCommand({
                        TableName: TABLE_NAME,
                        Key: { communityId: item.communityId },
                        UpdateExpression: 'SET drorOption = :drorOption, updatedAt = :updatedAt',
                        ExpressionAttributeValues: {
                            ':drorOption': updatedDrorOption,
                            ':updatedAt': new Date().toISOString()
                        },
                    });

                    await docClient.send(updateCommand);
                    console.log('  ✓ Updated successfully');
                }
                fixCount++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`Finished. Total records fixed: ${fixCount}`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\nError fixing typo:', error);
        process.exit(1);
    }
}

run();
