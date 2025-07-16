#!/usr/bin/env node
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:4500';

// Test data
const testData = {
  superAdmin: {
    email: 'admin@safeguard.com',
    password: 'SuperAdmin123!'
  },
  buildingData: {
    name: 'Test Building Complex',
    address: '123 Main Street, Downtown',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    postalCode: '100001',
    phone: '+2348012345678',
    email: 'building@example.com',
    totalLicenses: 100,
    securityLevel: 3,
    adminEmail: 'buildingadmin@example.com',
    adminPassword: 'AdminPass123!',
    adminFirstName: 'John',
    adminLastName: 'Doe',
    adminPhone: '+2348098765432',
    adminApartment: 'A1',
    licenseData: {
      planType: 'premium',
      durationMonths: 12,
      amount: 50000,
      currency: 'NGN',
      paymentReference: 'TEST_REF_001',
      features: {
        qrCodeGeneration: true,
        realTimeNotifications: true,
        visitorAnalytics: true,
        emergencyAlerts: true
      }
    }
  }
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

async function testHealthEndpoint() {
  console.log('\n📊 Testing Health Endpoint...');
  await makeRequest('/health');
}

async function testApiRoot() {
  console.log('\n🏠 Testing API Root...');
  await makeRequest('/api');
}

async function testAuthEndpoints() {
  console.log('\n🔐 Testing Authentication...');
  
  // Test registration (this might fail if user exists)
  const registerResult = await makeRequest('/api/auth/register', 'POST', {
    email: testData.superAdmin.email,
    password: testData.superAdmin.password,
    first_name: 'Super',
    last_name: 'Admin',
    phone: '+2348012345678',
    role: 'super_admin'
  });

  // Test login
  const loginResult = await makeRequest('/api/auth/login', 'POST', {
    email: testData.superAdmin.email,
    password: testData.superAdmin.password
  });

  if (loginResult.data && loginResult.data.success && loginResult.data.data.token) {
    authToken = loginResult.data.data.token;
    console.log('✅ Authentication successful, token obtained');
  } else {
    console.log('❌ Authentication failed');
  }
}

async function testAdminEndpoints() {
  console.log('\n🏢 Testing Admin Endpoints...');
  
  if (!authToken) {
    console.log('❌ No auth token available, skipping admin tests');
    return;
  }

  // Test building registration
  console.log('\n📋 Testing Building Registration...');
  const buildingResult = await makeRequest('/api/admin/buildings', 'POST', testData.buildingData);
  
  // Test get all buildings
  console.log('\n📂 Testing Get All Buildings...');
  await makeRequest('/api/admin/buildings');
  
  // Test get all licenses
  console.log('\n📜 Testing Get All Licenses...');
  await makeRequest('/api/admin/licenses');
  
  // Test dashboard stats
  console.log('\n📊 Testing Dashboard Stats...');
  await makeRequest('/api/admin/dashboard');
}

async function runTests() {
  console.log('🚀 Starting SafeGuard Admin API Tests...');
  
  // Test basic endpoints
  await testHealthEndpoint();
  await testApiRoot();
  
  // Test authentication
  await testAuthEndpoints();
  
  // Test admin functionality
  await testAdminEndpoints();
  
  console.log('\n✅ All tests completed!');
}

// Run tests
runTests().catch(console.error);