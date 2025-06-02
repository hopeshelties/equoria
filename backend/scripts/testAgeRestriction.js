/**
 * Test age restriction error message
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testAgeRestriction() {
  try {
    console.log('🧪 Testing age restriction error message...');

    const response = await fetch(`${BASE_URL}/api/grooms/interact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        foalId: 1,  // Test foal (young)
        groomId: 1,
        interactionType: 'brushing',  // Adult task
        duration: 30,
        notes: 'Testing age restriction'
      }),
    });

    console.log(`Status: ${response.status}`);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.message) {
      console.log('\n🔍 Exact message:', data.message);
      console.log('🔍 Contains "brushing"?', data.message.includes('brushing'));
      console.log('🔍 Contains "not an eligible task"?', data.message.includes('not an eligible task'));
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAgeRestriction();
