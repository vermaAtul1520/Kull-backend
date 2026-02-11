// scripts/migrate-occasion-contents.js
require('dotenv').config();
const mongoose = require('mongoose');
const { initializeDatabase, getDatabaseType, getAdapter } = require('../db');

// Define MongoDB Schema for OccasionContent (simplified for migration)
const OccasionContentSchema = new mongoose.Schema({
    occasion: { type: mongoose.Schema.Types.ObjectId, ref: 'Occasion' },
    type: String,
    url: String,
    thumbnailUrl: String,
    language: String,
    createdAt: Date,
    updatedAt: Date
}, { collection: 'occasioncontents' });

async function migrate() {
    await initializeDatabase();
    const adapter = getAdapter();

    // Ensure we're in DynamoDB mode for target
    if (getDatabaseType() !== 'dynamodb') {
        console.error('Target must be DynamoDB');
        return;
    }

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const OccasionContent = mongoose.model('OccasionContent', OccasionContentSchema);

    // Fetch all contents from MongoDB
    console.log('Fetching contents from MongoDB...');
    const contents = await OccasionContent.find({}).lean();
    console.log(`Found ${contents.length} contents in MongoDB`);

    if (contents.length === 0) {
        process.exit(0);
    }

    // Migrate to DynamoDB
    console.log('Migrating to DynamoDB...');
    let migratedCount = 0;
    for (const c of contents) {
        const item = {
            id: c._id.toString(),
            occasionId: c.occasion ? c.occasion.toString() : null,
            type: c.type,
            url: c.url,
            thumbnailUrl: c.thumbnailUrl,
            language: c.language,
            createdAt: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: c.updatedAt ? c.updatedAt.toISOString() : new Date().toISOString()
        };

        await adapter.putItem('occasion-contents', item);
        migratedCount++;
        if (migratedCount % 10 === 0) console.log(`Migrated ${migratedCount} items...`);
    }

    console.log(`Successfully migrated ${migratedCount} occasion contents to DynamoDB`);
    await mongoose.disconnect();
    process.exit(0);
}

migrate().catch(err => {
    console.error(err);
    process.exit(1);
});
