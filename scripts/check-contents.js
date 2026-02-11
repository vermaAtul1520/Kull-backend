// scripts/check-contents.js
require('dotenv').config();
const { initializeDatabase, getAdapter } = require('../db');

async function check() {
    await initializeDatabase();
    const adapter = getAdapter();
    const occasionId = "697a4dce23ebd976049a915c";

    console.log(`Checking contents for occasion: ${occasionId}`);

    // 1. Scan the whole table to see what's in there
    const result = await adapter.scan('occasion-contents');
    console.log(`Total contents in table: ${result.items.length}`);

    // 2. Query by occasionId
    const queryResult = await adapter.query('occasion-contents', {
        keyCondition: 'occasionId = :occasionId',
        keyValues: { ':occasionId': occasionId }
    });
    console.log(`Contents for this occasion: ${queryResult.items.length}`);
    if (queryResult.items.length > 0) {
        console.log(JSON.stringify(queryResult.items, null, 2));
    } else if (result.items.length > 0) {
        console.log("Sample item from scan:");
        console.log(JSON.stringify(result.items[0], null, 2));
    }
}

check().catch(console.error);
