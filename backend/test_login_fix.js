#!/usr/bin/env node

/**
 * Test Login Script
 * Tests the enhanced authentication endpoint
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4500';

console.log('🔐 Testing Enhanced Authentication');
console.log('='.repeat(40));

const testLogin = async () => {
  try {
    const loginData = {
      email: 'testuser@safeguard.com',
      password: 'TestPassword123!',
      rememberMe: true,
      deviceInfo: {
        userAgent: 'SafeGuard-Test-Client/1.0',
        deviceType: 'desktop',
        browser: 'test-browser',
        os: 'macOS'
      }
    };

    console.log('📤 Sending login request...');
    console.log('Endpoint: POST /api/auth/login');
    console.log('Data:', JSON.stringify(loginData, null, 2));

    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SafeGuard-Test-Client/1.0'
      },
      body: JSON.stringify(loginData)
    });

    const responseData = await response.json();

    console.log('\n📥 Response received:');
    console.log('Status:', response.status);
    console.log('Body:', JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log('\n✅ Login test PASSED!');
      console.log('🎉 The User.findByEmailWithSecurity method is working correctly!');
    } else {
      console.log('\n❌ Login test FAILED');
      console.log('Error:', responseData.error?.message || 'Unknown error');
      
      // Check if it's still the method error
      if (responseData.error?.message?.includes('findByEmailWithSecurity is not a function')) {
        console.log('🔧 The method is still missing from User model');
      } else {
        console.log('ℹ️  Different error - method fix may be working but other issue present');
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

// Also test with a new user (the one we just created)
const testNewUserLogin = async () => {
  try {
    const loginData = {
      email: 'newuser@safeguard.com',
      password: 'TestPassword123!',
      rememberMe: false,
      deviceInfo: {
        userAgent: 'SafeGuard-Test-Client/1.0',
        deviceType: 'desktop',
        browser: 'test-browser',
        os: 'macOS'
      }
    };

    console.log('\n🔐 Testing login with newly created user...');
    console.log('📤 Sending login request...');
    console.log('Email:', loginData.email);

    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SafeGuard-Test-Client/1.0'
      },
      body: JSON.stringify(loginData)
    });

    const responseData = await response.json();

    console.log('\n📥 New user login response:');
    console.log('Status:', response.status);
    console.log('Success:', responseData.success);

    if (response.ok) {
      console.log('✅ New user login PASSED!');
      console.log('🎉 Registration and login flow is working end-to-end!');
    } else {
      console.log('❌ New user login failed:', responseData.error?.message);
    }

  } catch (error) {
    console.log('❌ New user login test failed:', error.message);
  }
};

// Run tests
const runTests = async () => {
  try {
    await testLogin();
    await testNewUserLogin();
  } catch (error) {
    console.error('Test suite failed:', error);
  }
};

runTests();