// scripts/fix-occasion-data.js - Normalize categoryId in DynamoDB occasions table
require('dotenv').config();
const { initializeDatabase, getDatabaseType, getAdapter } = require('../db');
const { getOccasionService } = require('../services/occasionService');

async function fixOccasions() {
    // Initialize database
    await initializeDatabase();

    const dbType = getDatabaseType();
    if (dbType !== 'dynamodb') {
        console.log('Not using DynamoDB. Skipping migration fix.');
        return;
    }

    const service = getOccasionService();
    const adapter = getAdapter();
    const tableName = adapter.getTableName('occasions');

    console.log(`Normalizing data in table: ${tableName}`);

    // Scan all occasions
    const result = await adapter.scan('occasions');
    const items = result.items;

    console.log(`Found ${items.length} items to check.`);

    let fixedCount = 0;
    for (const item of items) {
        let updated = false;

        // 1. Ensure categoryId is populated from category
        if (!item.categoryId && item.category) {
            if (typeof item.category === 'string') {
                item.categoryId = item.category;
                updated = true;
            } else if (typeof item.category === 'object') {
                item.categoryId = item.category.id || item.category._id;
                updated = true;
            }
        }

        // 2. Ensure both id and _id are present (for data consistency)
        if (item.id && !item._id) {
            item._id = item.id;
            updated = true;
        }

        if (updated) {
            // Update item in DynamoDB
            // Use putItem to overwrite with normalized version
            await adapter.putItem('occasions', item);
            fixedCount++;
            console.log(`Fixed item: ${item.id}`);
        }
    }

    console.log(`Successfully normalized ${fixedCount} items.`);
}

fixOccasions().catch(console.error);
