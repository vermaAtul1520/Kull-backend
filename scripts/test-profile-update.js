require('dotenv').config();
const { getUserRepository } = require('../repositories/userRepository');
const { initializeDatabase } = require('../db');

async function testUpdate() {
    try {
        await initializeDatabase();
        const userRepo = getUserRepository();

        // Use a test user ID (replace with a real one from your DB for a real test)
        // Or find one first
        console.log("Searching for a user...");
        const users = await userRepo.find({}, { limit: 1 });
        if (users.length === 0) {
            console.log("No users found to test.");
            return;
        }

        const user = users[0];
        const userId = user.id;
        console.log(`Original User (${userId}):`, user.firstName, user.lastName);

        const newFirstName = `Updated-${Date.now()}`;
        console.log(`Attempting to update firstName to: ${newFirstName}`);

        const updatedUser = await userRepo.updateById(userId, { firstName: newFirstName });
        console.log("Update result returned:", updatedUser.firstName);

        console.log("Fetching user again to verify persistence...");
        const verifiedUser = await userRepo.findById(userId);
        console.log("Verified User firstName:", verifiedUser.firstName);

        if (verifiedUser.firstName === newFirstName) {
            console.log("SUCCESS: Update persisted!");
        } else {
            console.log("FAILURE: Update did NOT persist!");
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

testUpdate();
