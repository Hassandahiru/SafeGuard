#!/usr/bin/env node

/**
 * Test Registration Script
 * Tests the registration complete endpoint to verify schema fix
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4500';

console.log('🧪 Testing Registration Complete Endpoint');
console.log('='.repeat(45));

const testRegistration = async () => {
  try {
    const registrationData = {
      email: 'postmancollectiontest@safeguard.com',
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!',
      first_name: 'Test',
      last_name: 'User',
      phone: '+2348123456789',
      building_id: '5e006425-38a7-4363-9f66-8da6ba6b0c92',
      apartment_number: '101',
      role: 'resident',
      agreed_to_terms: true,
      agreed_to_privacy: true
    };

    console.log('📤 Sending registration request...');
    console.log('Endpoint: POST /api/registration/complete');
    console.log('Data:', JSON.stringify(registrationData, null, 2));

    const response = await fetch(`${API_BASE}/api/registration/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SafeGuard-Test-Client/1.0'
      },
      body: JSON.stringify(registrationData)
    });

    const responseData = await response.json();

    console.log('\n📥 Response received:');
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Body:', JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log('\n✅ Registration test PASSED!');
      console.log('🎉 The registration_ip schema fix is working correctly!');
    } else {
      console.log('\n❌ Registration test FAILED');
      console.log('Error:', responseData.error?.message || 'Unknown error');
      
      // Check if it's still the registration_ip column error
      if (responseData.error?.message?.includes('registration_ip')) {
        console.log('🔧 The registration_ip column issue is still present');
      } else {
        console.log('ℹ️  Different error - schema fix may be working but other validation failed');
      }
    }

  } catch (error) {
    console.log('\n❌ Test failed with error:');
    console.log(error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Make sure the SafeGuard server is running on port 4500');
    }
  }
};

// Test if server is running first
const testServerHealth = async () => {
  try {
    console.log('🔍 Checking server health...');
    const response = await fetch(`${API_BASE}/api/health`);
    
    if (response.ok) {
      console.log('✅ Server is running and healthy');
      return true;
    } else {
      console.log('⚠️  Server responded but may not be healthy');
      return true; // Still try the registration test
    }
  } catch (error) {
    console.log('❌ Server health check failed:', error.message);
    return false;
  }
};

// Run tests
const runTests = async () => {
  const serverRunning = await testServerHealth();
  
  if (serverRunning) {
    await testRegistration();
  } else {
    console.log('\n💡 Please start the SafeGuard server first:');
    console.log('   npm start');
    process.exit(1);
  }
};

runTests().catch(console.error);