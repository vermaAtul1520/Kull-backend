
const { initializeDatabase } = require('../db/index');
const { getUserRepository } = require('../repositories/userRepository');
require('../models/User'); // Register schema
const dotenv = require('dotenv');
const path = require('path');

// Load .env from root
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runTest() {
    try {
        console.log('Initializing Database...');
        await initializeDatabase();

        const userRepo = getUserRepository();

        // 1. Find a test user (or create one)
        console.log('Finding a test user...');
        // We can search for the one from the test script
        let user = await userRepo.findByEmail('jitender.amul@gmail.com');

        if (!user) {
            console.log('Test user not found, searching for any user...');
            const allUsers = await userRepo.find({}, { limit: 1 });
            user = allUsers[0];
        }

        if (!user) {
            console.error('No users found in database to test with.');
            return;
        }

        const userId = user.id || user._id;
        console.log(`Testing with user: ${user.firstName} ${user.lastName} (${userId})`);

        // 2. Perform update
        const newAddress = 'Debug Address ' + Date.now();
        console.log(`Updating address to: ${newAddress}`);

        const updated = await userRepo.updateById(userId, { address: newAddress });
        console.log('Update result data:', JSON.stringify(updated, null, 2));

        if (updated.address === newAddress) {
            console.log('✅ Update returned correct new value.');
        } else {
            console.error('❌ Update returned OLD value!');
        }

        // 3. Fetch again
        console.log('Fetching user again...');
        const fetched = await userRepo.findById(userId);
        console.log('Fetched data address:', fetched.address);

        if (fetched.address === newAddress) {
            console.log('✅ Persistence confirmed! The data is updated in the DB.');
        } else {
            console.error('❌ Persistence FAILED! The data in DB is still old.');
        }

    } catch (error) {
        console.error('Test error:', error);
    } finally {
        process.exit();
    }
}

runTest();
