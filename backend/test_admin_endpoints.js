#!/usr/bin/env node
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4500';

// Use existing super admin credentials
const adminCredentials = {
  email: 'admin@safeguard.com',
  password: 'SuperAdmin123!' // This might need to be adjusted based on actual password
};

let authToken = null;

async function makeRequest(url, method = 'GET', body = null, headers = {}) {
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${url}`, config);
    const data = await response.json();
    
    console.log(`\n🔍 ${method} ${url}`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return { response, data };
  } catch (error) {
    console.error(`❌ Error making request to ${url}:`, error.message);
    return { error };
  }
}

async function loginAsAdmin() {
  console.log('\n🔐 Logging in as Super Admin...');
  
  // Try different possible passwords
  const possiblePasswords = [
    'SuperAdmin123!',
    'admin123',
    'password',
    'admin',
    'safeguard123'
  ];

  for (const password of possiblePasswords) {
    console.log(`\n🔑 Trying password: ${password.substring(0, 3)}...`);
    
    const loginResult = await makeRequest('/api/auth/login', 'POST', {
      email: adminCredentials.email,
      password: password
    });

    if (loginResult.data && loginResult.data.success && loginResult.data.data.token) {
      authToken = loginResult.data.data.token;
      console.log('✅ Authentication successful!');
      return true;
    }
  }
  
  console.log('❌ All password attempts failed');
  return false;
}

async function testAdminEndpoints() {
  console.log('\n🏢 Testing Admin Endpoints...');
  
  // Test get all buildings
  console.log('\n📂 Testing Get All Buildings...');
  await makeRequest('/api/admin/buildings');
  
  // Test get all licenses
  console.log('\n📜 Testing Get All Licenses...');
  await makeRequest('/api/admin/licenses');
  
  // Test dashboard stats
  console.log('\n📊 Testing Dashboard Stats...');
  await makeRequest('/api/admin/dashboard');
  
  // Test create a new building
  console.log('\n🏗️  Testing Create New Building...');
  const newBuildingData = {
    name: 'New Test Building',
    address: '456 Test Avenue, Victoria Island',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    postalCode: '101001',
    phone: '+2348123456789',
    email: 'newbuilding@example.com',
    totalLicenses: 150,
    securityLevel: 4,
    adminEmail: 'newadmin@example.com',
    adminPassword: 'NewAdmin123!',
    adminFirstName: 'Jane',
    adminLastName: 'Smith',
    adminPhone: '+2348987654321',
    adminApartment: 'B1',
    licenseData: {
      planType: 'premium',
      durationMonths: 12,
      amount: 75000,
      currency: 'NGN',
      paymentReference: 'TEST_REF_002',
      features: {
        qrCodeGeneration: true,
        realTimeNotifications: true,
        visitorAnalytics: true,
        emergencyAlerts: true,
        advancedReporting: true
      }
    }
  };
  
  await makeRequest('/api/admin/buildings', 'POST', newBuildingData);
  
  // Test get building details (use existing building ID)
  console.log('\n🔍 Testing Get Building Details...');
  await makeRequest('/api/admin/buildings/d3eebccf-cd36-47cd-a933-37f4633da2b2');
}

async function runAdminTests() {
  console.log('🚀 Starting SafeGuard Admin API Tests...');
  
  // Test authentication
  const authSuccess = await loginAsAdmin();
  
  if (authSuccess) {
    // Test admin functionality
    await testAdminEndpoints();
  } else {
    console.log('❌ Cannot test admin endpoints without authentication');
  }
  
  console.log('\n✅ Admin tests completed!');
}

// Run tests
runAdminTests().catch(console.error);