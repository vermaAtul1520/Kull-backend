
require('dotenv').config();
const path = require('path');

let BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
if (!BASE_URL.endsWith('/api')) {
    BASE_URL += '/api';
}
// Using the token from the existing test script which is known to work locally if set up
const TOKEN = process.env.TEST_TOKEN || '';

async function testProfileFix() {
    if (!TOKEN) {
        console.error('❌ Error: TEST_TOKEN environment variable is required.');
        console.log('You can get one by logging in or from scripts/test-get-apis.sh');
        process.exit(1);
    }

    console.log('═'.repeat(60));
    console.log('  KULL Profile Fix Verification Test');
    console.log('═'.repeat(60));

    try {
        // 1. Get Initial Profile
        console.log('\nSTEP 1: Fetching initial profile...');
        const res1 = await fetch(`${BASE_URL}/users/profile`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const initialProfile = await res1.json();

        if (!res1.ok) {
            console.error('❌ Failed to fetch profile:', initialProfile);
            return;
        }
        console.log('✅ Initial Profile fetched successfully.');
        console.log('   Current Address:', initialProfile.data.address || 'Not Set');

        // 2. Perform Update
        const newAddress = 'Updated Address ' + new Date().toLocaleTimeString();
        console.log(`\nSTEP 2: Updating profile address to: "${newAddress}"...`);
        console.log('   (Also sending redundant "id" in body to test resilience)');

        const res2 = await fetch(`${BASE_URL}/users/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                address: newAddress,
                id: initialProfile.data.id || initialProfile.data._id
            })
        });
        const updateResult = await res2.json();

        if (!res2.ok) {
            console.error('❌ Failed to update profile:', updateResult);
            return;
        }
        console.log('✅ Profile updated successfully.');

        // 3. Fetch again to verify persistence
        console.log('\nSTEP 3: Fetching profile again to verify persistence...');
        const res3 = await fetch(`${BASE_URL}/users/profile`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const finalProfile = await res3.json();

        if (!res3.ok) {
            console.error('❌ Failed to fetch profile again:', finalProfile);
            return;
        }

        console.log('   Final Address:', finalProfile.data.address);

        if (finalProfile.data.address === newAddress) {
            console.log('\n✨ SUCCESS: Persistence verified! The data is updated and retrieved fresh.');
        } else {
            console.error('\n❌ FAILURE: Persistence verification failed. Data is still stale.');
        }

    } catch (error) {
        console.error('\n❌ Test Error:', error.message);
    }
}

testProfileFix();
