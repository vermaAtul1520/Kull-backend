const axios = require('axios');

async function testFixes() {
    const baseUrl = 'http://localhost:5000/api';
    const token = 'YOUR_TEST_TOKEN'; // Would need a valid token to run for real

    console.log('--- Testing City Search Fix ---');
    try {
        const res = await axios.get(`${baseUrl}/users/city-search?city=123456`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('City Search (PIN) Success:', res.data.success, 'Count:', res.data.count);
    } catch (e) {
        console.error('City Search Failed:', e.response?.data || e.message);
    }

    console.log('\n--- Testing User Delete Fix ---');
    try {
        const res = await axios.delete(`${baseUrl}/users/some-user-id`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('User Delete Check (should not be 500):', res.status);
    } catch (e) {
        if (e.response?.status === 500) {
            console.error('User Delete FAILED with 500');
        } else {
            console.log('User Delete returned expected error/status:', e.response?.status);
        }
    }

    console.log('\n--- Testing Officers List Fix ---');
    try {
        const res = await axios.get(`${baseUrl}/communities/some-comm-id/users/orgofficers`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Officers Fetch Success:', res.data.success, 'Count:', res.data.count);
    } catch (e) {
        console.error('Officers Fetch Failed:', e.response?.data || e.message);
    }
}

console.log('Note: This script requires a running server and valid token to execute fully.');
// testFixes();
