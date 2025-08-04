#!/usr/bin/env node

/**
 * Endpoint Testing Script
 * Tests all available endpoints to identify any 404 issues
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const BASE_URL = 'http://localhost:4500';

// Test endpoints to verify they exist (not necessarily that they work)
const endpoints = [
  // Basic endpoints
  { method: 'GET', url: '/health', description: 'Health Check' },
  { method: 'GET', url: '/api', description: 'API Info' },
  
  // Authentication endpoints
  { method: 'POST', url: '/api/auth/register', description: 'Basic Auth - Register' },
  { method: 'POST', url: '/api/auth/login', description: 'Basic Auth - Login' },
  
  // Enhanced authentication endpoints
  { method: 'POST', url: '/api/auth/enhanced/login', description: 'Enhanced Auth - Login' },
  { method: 'GET', url: '/api/auth/enhanced/security-settings', description: 'Enhanced Auth - Security Settings' },
  { method: 'GET', url: '/api/auth/enhanced/sessions', description: 'Enhanced Auth - Sessions' },
  
  // User registration (signup) endpoints
  { method: 'POST', url: '/api/registration/validate', description: 'Registration - Validate' },
  { method: 'POST', url: '/api/registration/complete', description: 'Registration - Complete' },
  { method: 'POST', url: '/api/registration/self-register', description: 'Registration - Self Register' },
  { method: 'POST', url: '/api/registration/building-admin', description: 'Registration - Building Admin' },
  { method: 'POST', url: '/api/registration/security', description: 'Registration - Security' },
  { method: 'POST', url: '/api/registration/bulk', description: 'Registration - Bulk' },
  { method: 'GET', url: '/api/registration/templates', description: 'Registration - Templates' },
  
  // Admin & building management endpoints
  { method: 'POST', url: '/api/admin/initial-setup', description: 'Admin - Initial Setup' },
  { method: 'GET', url: '/api/admin/buildings', description: 'Admin - Get Buildings' },
  { method: 'POST', url: '/api/admin/buildings', description: 'Admin - Create Building' },
  { method: 'GET', url: '/api/admin/dashboard', description: 'Admin - Dashboard' },
  
  // Visitor management endpoints
  { method: 'GET', url: '/api/visitors/invitations', description: 'Visitors - Invitations' },
  { method: 'POST', url: '/api/visitors/invitations', description: 'Visitors - Create Invitation' },
  { method: 'GET', url: '/api/frequent-visitors', description: 'Frequent Visitors - List' },
  { method: 'POST', url: '/api/frequent-visitors', description: 'Frequent Visitors - Create' },
  { method: 'GET', url: '/api/visitor-bans', description: 'Visitor Bans - List' },
  { method: 'POST', url: '/api/visitor-bans', description: 'Visitor Bans - Create' }
];

async function testEndpoint(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint.url}`, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json'
      },
      // Add minimal body for POST requests to avoid validation errors
      ...(endpoint.method === 'POST' && { body: JSON.stringify({ test: 'data' }) })
    });
    
    return {
      ...endpoint,
      status: response.status,
      statusText: response.statusText,
      exists: response.status !== 404
    };
  } catch (error) {
    return {
      ...endpoint,
      status: 'ERROR',
      statusText: error.message,
      exists: false
    };
  }
}

async function testAllEndpoints() {
  console.log('🧪 Testing SafeGuard API Endpoints');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}\n`);
  
  const results = await Promise.all(endpoints.map(testEndpoint));
  
  // Categorize results
  const working = results.filter(r => r.exists);
  const notFound = results.filter(r => r.status === 404);
  const errors = results.filter(r => r.status === 'ERROR');
  
  console.log('✅ WORKING ENDPOINTS:');
  console.log('-'.repeat(40));
  working.forEach(r => {
    const statusColor = r.status === 200 ? '🟢' : r.status < 500 ? '🟡' : '🔴';
    console.log(`${statusColor} ${r.method.padEnd(6)} ${r.url.padEnd(35)} ${r.status} ${r.statusText}`);
  });
  
  if (notFound.length > 0) {
    console.log('\n❌ 404 NOT FOUND:');
    console.log('-'.repeat(40));
    notFound.forEach(r => {
      console.log(`🔴 ${r.method.padEnd(6)} ${r.url.padEnd(35)} ${r.status} ${r.statusText}`);
    });
  }
  
  if (errors.length > 0) {
    console.log('\n⚠️  ERRORS:');
    console.log('-'.repeat(40));
    errors.forEach(r => {
      console.log(`⚠️  ${r.method.padEnd(6)} ${r.url.padEnd(35)} ${r.statusText}`);
    });
  }
  
  console.log('\n📊 SUMMARY:');
  console.log('-'.repeat(20));
  console.log(`✅ Working: ${working.length}`);
  console.log(`❌ Not Found: ${notFound.length}`);
  console.log(`⚠️  Errors: ${errors.length}`);
  console.log(`📋 Total: ${results.length}`);
  
  if (notFound.length === 0 && errors.length === 0) {
    console.log('\n🎉 All endpoints are accessible!');
  } else {
    console.log('\n💡 Endpoints returning 401/422 are working (authentication/validation errors are expected)');
    console.log('💡 Only 404 errors indicate missing endpoints');
  }
  
  return results;
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  testAllEndpoints().catch(console.error);
}

export default testAllEndpoints;