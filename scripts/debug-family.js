const { getFamilyRepository } = require('../repositories/familyRepository');
const { getUserRepository } = require('../repositories/userRepository');
const { initializeDatabase } = require('../db');
require('dotenv').config();

const debugFamily = async () => {
    try {
        await initializeDatabase();

        const familyRepo = getFamilyRepository();
        const userRepo = getUserRepository();

        const myId = "6979dffe587769b07ff82a95"; // Jitender
        console.log(`Searching relationships for user: ${myId}`);

        const relationships = await familyRepo.findAllRelationships(myId);
        console.log("Relationships found:", JSON.stringify(relationships, null, 2));

        if (relationships.length > 0) {
            const rel = relationships[0];
            const relatedUserId = rel.relatedUser || rel.relatedUserId;
            console.log(`Checking related user ID: ${relatedUserId} (Type: ${typeof relatedUserId})`);

            const relatedUser = await userRepo.findById(relatedUserId);
            console.log("Related User found:", JSON.stringify(relatedUser, null, 2));
        }

    } catch (err) {
        console.error("Error:", err);
    }
    process.exit();
};

debugFamily();
