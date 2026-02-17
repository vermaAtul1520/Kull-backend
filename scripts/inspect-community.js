process.env.DB_TYPE = 'dynamodb';
process.env.DYNAMODB_TABLE_PREFIX = 'kull-prod-';
process.env.AWS_REGION = 'ap-south-1';

const { initializeDatabase } = require('../db');
const { getCommunityRepository } = require('../repositories/communityRepository');
const { getCommunityConfigRepository } = require('../repositories/communityConfigRepository');

async function inspect() {
    await initializeDatabase();

    const commRepo = getCommunityRepository();
    const configRepo = getCommunityConfigRepository();

    // Bhedkut ID
    const commId = '6958076de069d5262887256f';

    console.log(`Inspecting Community: ${commId}`);
    try {
        const comm = await commRepo.findById(commId);
        console.log("Community:", JSON.stringify(comm, null, 2));

        console.log("\nInspecting Config...");
        const config = await configRepo.findByCommunityId(commId);
        console.log("Config:", JSON.stringify(config, null, 2));
    } catch (err) {
        console.error("Error during inspection:", err);
    }
}

inspect();
