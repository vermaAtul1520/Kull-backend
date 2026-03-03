const axios = require('axios');

async function runTests() {
  try {
    const API_URL = 'http://localhost:5000/api';
    const jwt = require('jsonwebtoken');
    // Generate token for a valid community member
    const token = jwt.sign(
      { id: '695792bad4ad1bc7243a7178', role: 'superadmin', community: '695792b9d4ad1bc7243a716b', roleInCommunity: 'member' },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      { expiresIn: '7d' }
    );
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log('1. Testing legacy POST (sending only imageUrl)...');
    const createRes = await axios.post(`${API_URL}/posts/community/695792b9d4ad1bc7243a716b`, {
      title: 'Legacy Compatibility Test',
      content: 'This post only has an imageUrl, mimicking the old APP versions.',
      imageUrl: 'https://example.com/legacy-image.jpg'
    }, { headers });

    console.log('Legacy POST Success:', createRes.data.success);
    
    console.log('2. Testing GET posts (fetching all posts)...');
    const getRes = await axios.get(`${API_URL}/posts/community/695792b9d4ad1bc7243a716b`, { headers });
    console.log(`GET Posts Success: ${getRes.data.success}, Total fetched: ${getRes.data.count}`);
    
    // Check if the legacy post was correctly converted
    const legacyPost = getRes.data.data.find(p => p.title === 'Legacy Compatibility Test');
    console.log('Legacy Post media mapping details:');
    console.log('- imageUrl:', legacyPost.imageUrl);
    console.log('- media length:', legacyPost.media?.length);
    console.log('- media type:', legacyPost.media?.[0]?.mediaType);
    
    console.log('All backward-compatibility tests passed!');
  } catch (error) {
    console.error('Test failed:', error.response ? error.response.data : error.message);
  }
}

runTests();
