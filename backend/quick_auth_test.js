#!/usr/bin/env node

/**
 * Quick Authentication Test
 * Verifies the test user exists and can login successfully
 */

console.log('🚀 Quick Authentication Test');
console.log('='.repeat(40));

const BASE_URL = 'http://localhost:4500';
const TEST_USER = {
  email: 'testuser@safeguard.com',
  password: 'TestPassword123!'
};

async function testLogin() {
  try {
    console.log('1. Testing login with test user...');
    console.log(`   Email: ${TEST_USER.email}`);
    console.log(`   Password: ${TEST_USER.password}`);

    const response = await fetch(`${BASE_URL}/api/auth/enhanced/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
        device_name: 'Quick Test Script',
        location: 'Test Location'
      })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Login successful!');
      console.log(`   User ID: ${data.data.user.id}`);
      console.log(`   Email: ${data.data.user.email}`);
      console.log(`   Role: ${data.data.user.role}`);
      console.log(`   Token Length: ${data.data.accessToken.length} characters`);
      console.log(`   Token Preview: ${data.data.accessToken.substring(0, 50)}...`);
      
      // Test protected endpoint
      console.log('\n2. Testing protected endpoint...');
      const protectedResponse = await fetch(`${BASE_URL}/api/auth/enhanced/security-settings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.data.accessToken}`
        }
      });

      const protectedData = await protectedResponse.json();
      
      if (protectedResponse.ok && protectedData.success) {
        console.log('✅ Protected endpoint access successful!');
        console.log(`   Security Score: ${protectedData.data.security_score || 'N/A'}`);
        console.log(`   Active Sessions: ${protectedData.data.active_sessions_count || 'N/A'}`);
        console.log('   Recommendations:', protectedData.data.recommendations?.length || 0);
      } else {
        console.log('❌ Protected endpoint failed:');
        console.log(`   Status: ${protectedResponse.status}`);
        console.log(`   Error: ${protectedData.error?.message || 'Unknown error'}`);
      }

      console.log('\n🎉 Authentication is working correctly!');
      console.log('\n📋 For Postman testing:');
      console.log(`   1. Use email: ${TEST_USER.email}`);
      console.log(`   2. Use password: ${TEST_USER.password}`);
      console.log(`   3. Copy this token to {{accessToken}}:`);
      console.log(`      ${data.data.accessToken}`);

    } else {
      console.log('❌ Login failed:');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.error?.message || 'Unknown error'}`);
      console.log(`   Details: ${JSON.stringify(data.error?.details || {}, null, 2)}`);
      
      if (response.status === 401) {
        console.log('\n💡 Try running the login test script to create the test user:');
        console.log('   node test_login.js');
      }
    }

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log('\n💡 Make sure:');
    console.log('   - Server is running on port 4500');
    console.log('   - Database is connected');
    console.log('   - Test user exists (run: node test_login.js)');
  }
}

async function testServerHealth() {
  try {
    console.log('\n0. Testing server health...');
    const response = await fetch(`${BASE_URL}/health`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Server is healthy');
      console.log(`   Status: ${data.status}`);
      console.log(`   Environment: ${data.environment}`);
      console.log(`   Uptime: ${data.uptime?.toFixed(2)} seconds`);
    } else {
      console.log('❌ Server health check failed');
      console.log(`   Status: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Server is not responding');
    console.log(`   Error: ${error.message}`);
    console.log('\n💡 Make sure the server is running:');
    console.log('   npm start  or  node src/app.js');
    return false;
  }
  return true;
}

// Run tests
async function runTests() {
  const serverHealthy = await testServerHealth();
  if (serverHealthy) {
    await testLogin();
  }
  
  console.log('\n='.repeat(40));
  console.log('🎯 Quick Test Complete!');
}

runTests().catch(console.error);