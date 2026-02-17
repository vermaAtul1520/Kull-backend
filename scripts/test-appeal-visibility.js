
require('dotenv').config();
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Generate a superadmin token
const payload = {
    id: "6979dffe587769b07ff82a95",
    role: "superadmin",
    email: "superadmin@example.com"
};
const TOKEN = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

async function testAppealVisibility() {
    console.log('═'.repeat(60));
    console.log('  Testing Appeal Visibility for Super Admin');
    console.log('═'.repeat(60));

    try {
        console.log('\nFETCHING appeals WITHOUT community filter...');
        const res = await fetch(`${BASE_URL}/appeals`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const result = await res.json();

        if (!res.ok) {
            console.error('❌ Failed to fetch appeals:', result);
            return;
        }

        console.log(`✅ Status: ${res.status}`);
        console.log(`✅ Appeals count: ${result.data ? result.data.length : 'N/A'}`);

        if (result.data && result.data.length === 0) {
            console.log('\n⚠️  CONFIRMED: Bug exists. Super admin sees 0 appeals when no community filter is applied.');
        } else {
            console.log('\n✨ Appeals found! Note: If the DB is empty, this 0 might be correct, but based on code analysis, it should be [] due to explicit logic.');
        }

    } catch (error) {
        console.error('\n❌ Test Error:', error.message);
        if (error.message.includes('fetch failed')) {
            console.log('   (Make sure the backend server is running!)');
        }
    }
}

testAppealVisibility();
